import os
from PIL import Image
import sys

# Increase PIL threshold for large images
Image.MAX_IMAGE_PIXELS = None

def optimize_images(directory):
    total_freed = 0
    count = 0
    skipped = 0
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            ext = file.lower().split('.')[-1]
            if ext in ['jpg', 'jpeg', 'png']:
                original_path = os.path.join(root, file)
                
                # Create WebP path
                filename_without_ext = os.path.splitext(file)[0]
                webp_path = os.path.join(root, f"{filename_without_ext}.webp")
                
                # Force replace if it exists to ensure standard quality
                try:
                    original_size = os.path.getsize(original_path)
                    
                    with Image.open(original_path) as img:
                        # Convert appropriately
                        if img.mode in ("RGBA", "P"):
                            img.save(webp_path, "webp", quality=85)
                        else:
                            img.save(webp_path, "webp", quality=85)
                            
                    new_size = os.path.getsize(webp_path)
                    
                    if new_size > 0:
                        os.remove(original_path)
                        freed = original_size - new_size
                        total_freed += freed
                        count += 1
                        print(f"[{count}] Converted {file} -> .webp (Saved {freed / 1024:.1f} KB)")
                        
                except Exception as e:
                    print(f"Failed to convert {file}: {e}")
                    if os.path.exists(webp_path):
                        try:
                            os.remove(webp_path)
                        except:
                            pass
                        
    print(f"\n--- Optimization Complete ---")
    print(f"Successfully converted {count} images.")
    print(f"Total space saved: {total_freed / (1024*1024):.2f} MB")

if __name__ == "__main__":
    images_dir = os.path.join(os.path.dirname(__file__), "images")
    if os.path.exists(images_dir):
        print(f"Starting bulk optimization of: {images_dir}")
        optimize_images(images_dir)
    else:
        print("Images directory not found.")
