
import os
import json
import re

# Path setup
BASE_DIR = os.getcwd()
DATA_JS_PATH = os.path.join(BASE_DIR, 'data.js')
THUMBNAIL_DIR = os.path.join(BASE_DIR, 'thumbnail')
OUTPUT_JS_PATH = os.path.join(BASE_DIR, 'thumbnails.js')

# Specific directory names in data.js -> valid directory names in thumbnail folder
DIRECTORY_ALIASES = {
    "Abs Machines": "abs exercise machine",
    # Add more if found
}

def load_data_js():
    try:
        with open(DATA_JS_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading data.js: {e}")
        return {}
    
    start = content.find('{')
    end = content.rfind('}')
    if start == -1 or end == -1: return {}
    json_str = content[start:end+1]
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        json_str = re.sub(r',\s*}', '}', json_str)
        json_str = re.sub(r',\s*]', ']', json_str)
        try:
            return json.loads(json_str)
        except:
            return {}

def find_first_image_in_dir(dir_path):
    if os.path.exists(dir_path) and os.path.isdir(dir_path):
        files = os.listdir(dir_path)
        for f in files:
            if f.lower().endswith(('.webp', '.png', '.jpg', '.jpeg')):
                return f
    return None

def find_thumbnail(image_path_from_data):
    # Normalize
    image_path_from_data = image_path_from_data.replace('\\', '/')
    parts = image_path_from_data.split('/')
    
    if parts[0].lower() == 'images':
        # Start building path parts: ['thumbnail', 'Cat', 'Sub', 'Product']
        # Note: parts has ['images', 'Cat', 'Sub', 'Product', 'file.ext']
        # We generally want the directory: ['thumbnail', 'Cat', 'Sub', 'Product']
        core_parts = parts[1:-1] # 'Cat', 'Sub', 'Product'
    else:
        core_parts = parts[:-1]

    # Apply Aliases
    cleaned_core_parts = []
    for p in core_parts:
        cleaned_core_parts.append(DIRECTORY_ALIASES.get(p, p))

    # Pattern A: Standard (thumbnail/Cat/Sub/Product)
    target_parts_A = ['thumbnail'] + cleaned_core_parts
    path_A = os.path.join(BASE_DIR, *target_parts_A)
    
    img_A = find_first_image_in_dir(path_A)
    if img_A:
        return "/".join(target_parts_A + [img_A])

    # Pattern B: Flattened / Missing Product Folder (thumbnail/Cat/Sub)
    # This handles "Abs Machines" -> "abs exercise machine" -> [Files directly here]
    if len(cleaned_core_parts) > 1:
        target_parts_B = ['thumbnail'] + cleaned_core_parts[:-1] # Remove Product folder
        path_B = os.path.join(BASE_DIR, *target_parts_B)
        img_B = find_first_image_in_dir(path_B)
        if img_B:
            return "/".join(target_parts_B + [img_B])

    return None

def load_metadata():
    if os.path.exists('thumbnail_metadata.json'):
        try:
            with open('thumbnail_metadata.json', 'r') as f:
                return json.load(f)
        except:
            return {"products": {}, "categories": {}, "subcategories": {}}
    return {"products": {}, "categories": {}, "subcategories": {}}

def main():
    if not os.path.exists(DATA_JS_PATH):
        print(f"data.js not")
        return

    data = load_data_js()
    metadata = load_metadata()
    
    thumbnail_map = {}
    missing_count = 0
    found_count = 0

    print("Scanning...")

    # 1. Product Thumbnails
    for key, item in data.items():
        thumb_path = None
        
        # Check Manual Override first
        if key in metadata.get('products', {}):
            thumb_path = metadata['products'][key]
        # Fallback to auto-scan
        elif 'images' in item and item['images'] and len(item['images']) > 0:
            thumb_path = find_thumbnail(item['images'][0])
        
        if thumb_path:
            thumbnail_map[key] = thumb_path
            found_count += 1
        else:
            missing_count += 1
            # print(f"MISSING: {key}")

    # 2. Category Thumbnails (Prefix: 'category:')
    for cat, path in metadata.get('categories', {}).items():
        thumbnail_map[f"category:{cat}"] = path

    # 3. Subcategory Thumbnails (Prefix: 'subcategory:')
    for sub, path in metadata.get('subcategories', {}).items():
        thumbnail_map[f"subcategory:{sub}"] = path

    js_content = f"const thumbnailData = {json.dumps(thumbnail_map, indent=4)};\n"
    with open(OUTPUT_JS_PATH, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f"Detailed scan finished. Found: {found_count}, Missing: {missing_count}")

if __name__ == "__main__":
    main()
