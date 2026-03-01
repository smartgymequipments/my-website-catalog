import os
import json
import re

base_path = r'c:\Users\khama\Website catalogue'
images_rel_path = 'images'
images_path = os.path.join(base_path, images_rel_path)

def slugify(text):
    return re.sub(r'[\s]+', '-', text.lower())

data = {}

# Load existing descriptions if available
descriptions_file = 'descriptions.json'
existing_descriptions = {}
if os.path.exists(descriptions_file):
    try:
        with open(descriptions_file, 'r', encoding='utf-8') as f:
            existing_descriptions = json.load(f)
    except Exception as e:
        print(f"Warning: Could not load {descriptions_file}: {e}")

# Load product metadata (variants, etc.)
metadata_file = 'product_metadata.json'
product_metadata = {}
if os.path.exists(metadata_file):
    try:
        with open(metadata_file, 'r', encoding='utf-8') as f:
            product_metadata = json.load(f)
    except Exception as e:
        print(f"Warning: Could not load {metadata_file}: {e}")

# Categories (Directories in images/)
if os.path.exists(images_path):
    categories = [d for d in os.listdir(images_path) if os.path.isdir(os.path.join(images_path, d))]
    
    for category in categories:
        category_path = os.path.join(images_path, category)
        
        # Walk through the category directory
        for root, dirs, files in os.walk(category_path):
            # Check for images in the current directory
            valid_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.gif')
            local_images = [f for f in files if f.lower().endswith(valid_extensions)]
            
            if local_images:
                # This directory is an "Equipment"
                equipment_name = os.path.basename(root)
                
                # If the current folder is the category folder itself, it might be a flat structure
                # Use folder name as key
                key = slugify(equipment_name)
                
                # Construct relative paths
                img_paths = []
                for img in local_images:
                    full_path = os.path.join(root, img)
                    rel_path = os.path.relpath(full_path, base_path)
                    rel_path = rel_path.replace(os.sep, '/')
                    img_paths.append(rel_path)
                
                # Determine Subcategory
                rel_from_cat = os.path.relpath(root, category_path)
                parts = rel_from_cat.split(os.sep)
                
                subcategory = "General"
                # If rel_from_cat is '.', it means images are directly in Category folder
                if rel_from_cat != '.':
                    # The first folder inside the Category folder IS the subcategory
                    subcategory = parts[0]
                
                # Append "Machines" to subcategories for specific parent categories
                if category.lower() in ['plate loaded equipments', 'selectorized equipments']:
                    if not subcategory.lower().endswith('machines'):
                         subcategory += " Machines"

                if key in data:
                   key = f"{key}-{slugify(category)}"
                
                # Fetch existing metadata if available
                desc = ""
                specs = {}
                if key in existing_descriptions:
                    desc = existing_descriptions[key].get('description', '')
                    specs = existing_descriptions[key].get('specs', {})
                    
                variants = product_metadata.get(key, {}).get('variants', [])
                
                # Fetch show_in_latest flag (defaults to True if not exist for backwards compatibility)
                show_in_latest = product_metadata.get(key, {}).get('show_in_latest', True)

                data[key] = {
                    'name': equipment_name,
                    'category': category,
                    'subcategory': subcategory,
                    'images': sorted(img_paths),
                    'date_added': max([os.path.getmtime(os.path.join(root, img)) for img in local_images]) if local_images else 0,
                    'variants': variants,
                    'show_in_latest': show_in_latest
                }

# Write to data.js
with open('data.js', 'w', encoding='utf-8') as f:
    f.write('const equipmentData = ')
    json.dump(data, f, indent=4)
    f.write(';')
