import os
import json
import re
from flask import Flask, request, jsonify, session, redirect, send_from_directory, url_for
from functools import wraps
from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash, generate_password_hash
import mysql.connector
import shutil
import sys
import subprocess
import glob
import time

app = Flask(__name__, static_folder='.', static_url_path='')

# Configuration
app.secret_key = 'super_secret_key_change_this_in_production'  # TO DO: Change this
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, 'images')
DATA_JS_PATH = os.path.join(BASE_DIR, 'data.js')
DESCRIPTIONS_JSON_PATH = os.path.join(BASE_DIR, 'descriptions.json')

# Helper: Slugify
def slugify(text):
    return re.sub(r'[\s]+', '-', text.lower())

# Helper: Auth Decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect('/portal-access-99')
        return f(*args, **kwargs)
    return decorated_function

# Helper: Safe Filename (Preserve Spaces)
def safe_filename(filename):
    # Remove path traversal characters
    filename = os.path.basename(filename)
    # Allow spaces, but still remove some dangerous chars if needed
    # For now, just rely on basename to prevent traversal
    # and maybe remove typically problematic chars but Keep Spaces.
    # Actually, let's strictly just prevent traversal and use the name.
    return filename

# --- Routes ---

@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# 1. Hidden Login Route
@app.route('/portal-access-99')
def login_page():
    if 'logged_in' in session:
        return redirect('/dashboard')
    # Simple HTML login form embedded for simplicity, or serve a file
    return '''
    <!DOCTYPE html>
    <html class="dark">
    <head>
        <title>Portal Access</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .glass {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
        </style>
    </head>
    <body class="bg-black flex items-center justify-center h-screen font-sans">
        <div class="glass p-8 rounded-xl shadow-2xl w-full max-w-sm">
            <h2 class="text-3xl text-yellow-400 font-bold mb-6 text-center">Restricted Access</h2>
            <form id="loginForm" class="space-y-6">
                <div>
                    <label class="block text-gray-300 mb-2 text-sm uppercase tracking-wide">Username</label>
                    <input type="text" id="username" class="w-full p-3 rounded bg-gray-900/50 text-white border border-gray-700 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition">
                </div>
                <div>
                    <label class="block text-gray-300 mb-2 text-sm uppercase tracking-wide">Password</label>
                    <input type="password" id="password" class="w-full p-3 rounded bg-gray-900/50 text-white border border-gray-700 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition">
                </div>
                <button type="submit" class="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold p-3 rounded transition shadow-lg hover:shadow-yellow-400/20">Login</button>
            </form>
            <p id="error" class="text-red-500 mt-4 text-center hidden font-bold"></p>
        </div>
        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const u = document.getElementById('username').value;
                const p = document.getElementById('password').value;
                
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: u, password: p})
                });
                
                if (res.ok) {
                    window.location.href = '/dashboard';
                } else {
                    document.getElementById('error').textContent = 'Invalid credentials';
                    document.getElementById('error').classList.remove('hidden');
                }
            });
        </script>
    </body>
    </html>
    '''

# 2. Protected Dashboard Route
@app.route('/dashboard')
@login_required
def dashboard():
    return send_from_directory('.', 'dashboard.html')

# --- Database Connection ---
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",      
        database="specifications_db" 
    )

# --- API ---

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'error': 'Missing credentials'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, password_hash FROM admin_users WHERE username = %s LIMIT 1", (username,))
        user = cursor.fetchone()
        
        if user and check_password_hash(user['password_hash'], password):
            session['logged_in'] = True
            session['username'] = username
            
            # Update last login
            cursor.execute("UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = %s", (user['id'],))
            conn.commit()
            
            return jsonify({'success': True})
    except Exception as e:
        print(f"Login error: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
            
    return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

@app.route('/api/change_password', methods=['POST'])
@login_required
def api_change_password():
    data = request.json
    current_pass = data.get('current_password')
    new_pass = data.get('new_password')
    username = session.get('username', 'admin') # fallback to 'admin' if not set
    
    if not current_pass or not new_pass:
        return jsonify({'success': False, 'error': 'Missing fields'}), 400
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, password_hash FROM admin_users WHERE username = %s LIMIT 1", (username,))
        user = cursor.fetchone()
        
        if user and check_password_hash(user['password_hash'], current_pass):
            # Hash new password and update
            new_hash = generate_password_hash(new_pass)
            cursor.execute("UPDATE admin_users SET password_hash = %s WHERE id = %s", (new_hash, user['id']))
            conn.commit()
            
            # Log user out so they have to log in with new password
            session.pop('logged_in', None)
            session.pop('username', None)
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Incorrect current password'}), 401
    except Exception as e:
        print(f"Change password error: {e}")
        return jsonify({'success': False, 'error': 'Database error occurred'}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.pop('logged_in', None)
    return jsonify({'success': True})

@app.route('/api/products', methods=['GET'])
@login_required
def get_products():
    # Read data.js and return as JSON
    products = []
    
    if os.path.exists(IMAGES_DIR):
        categories = [d for d in os.listdir(IMAGES_DIR) if os.path.isdir(os.path.join(IMAGES_DIR, d))]
        
        for category in categories:
            cat_path = os.path.join(IMAGES_DIR, category)
            for root, dirs, files in os.walk(cat_path):
                valid_exts = ('.jpg', '.jpeg', '.png', '.webp', '.gif')
                local_images = [f for f in files if f.lower().endswith(valid_exts)]
                
                if local_images:
                    equipment_name = os.path.basename(root)
                    
                    # Logic to determine subcategory
                    rel_from_cat = os.path.relpath(root, cat_path)
                    parts = rel_from_cat.split(os.sep)
                    
                    subcategory = "General"
                    if rel_from_cat != '.':
                        subcategory = parts[0]
                    
                    # Construct image paths
                    img_paths = []
                    for img in local_images:
                         # relative web path
                         full_path = os.path.join(root, img)
                         rel_path = os.path.relpath(full_path, BASE_DIR).replace(os.sep, '/')
                         img_paths.append(rel_path)
                    
                    key = slugify(equipment_name)
                    
                    products.append({
                        'key': key, 
                        'name': equipment_name,
                        'category': category,
                        'subcategory': subcategory,
                        'images': img_paths,
                        'folder_path': os.path.relpath(root, BASE_DIR).replace(os.sep, '/') 
                    })
                    
    return jsonify(products)

@app.route('/api/subcategories', methods=['GET'])
@login_required
def get_subcategories():
    category = request.args.get('category')
    if not category:
        return jsonify([])
        
    cat_path = os.path.join(IMAGES_DIR, category)
    if not os.path.exists(cat_path):
        return jsonify([])
        
    # List immediate directories in the category folder
    subcategories = [d for d in os.listdir(cat_path) if os.path.isdir(os.path.join(cat_path, d))]
    
    # Filter out product folders? 
    # This is tricky because the structure is confusing: images/Category/Subcategory/Product OR images/Category/Product
    # A heuristic: if a folder has images directly inside it, it's likely a product. If it has folders inside it, it's a subcategory.
    # But product folders can be empty of images if new.
    # Let's rely on the user's existing structure.
    
    # Actually, let's just return all directories. The user can choose. 
    # Or better, we can scan the entire depth and collect all "intermediate" folders that act as subcategories.
    # For now, listing immediate children is a safe bet. WE can include "General" always.
    
    result = ['General'] + subcategories
    return jsonify(list(set(result))) # removing duplicates if 'General' exists

@app.route('/api/product/add', methods=['POST'])
@login_required
def add_product():
    # Form data: title, category, subcategory, image file
    title = request.form.get('title')
    category = request.form.get('category')
    subcategory = request.form.get('subcategory')
    file = request.files.get('image')
    
    if not title or not category or not file:
        return jsonify({'error': 'Missing fields'}), 400
        
    safe_title = secure_filename(title)
    
    target_dir = os.path.join(IMAGES_DIR, category)
    if subcategory and subcategory != 'General':
        target_dir = os.path.join(target_dir, subcategory)
    
    product_dir = os.path.join(target_dir, safe_title)
    
    if not os.path.exists(product_dir):
        os.makedirs(product_dir)
        
    filename = safe_filename(file.filename)
    file.save(os.path.join(product_dir, filename))
    
    # Save metadata including show_in_latest flag
    show_in_latest = request.form.get('show_in_latest') == 'true'
    key = slugify(title)
    meta = load_product_metadata()
    if key not in meta:
        meta[key] = {}
    meta[key]['show_in_latest'] = show_in_latest
    save_product_metadata(meta)
    
    regenerate_data_js()
    return jsonify({'success': True})

@app.route('/api/product/edit', methods=['POST'])
@login_required
def edit_product():
    # Update title (rename folder)
    original_folder = request.form.get('original_folder') 
    new_title = request.form.get('title')
    
    if not original_folder or not os.path.exists(os.path.join(BASE_DIR, original_folder)):
        return jsonify({'error': 'Product not found'}), 404
        
    abs_folder = os.path.join(BASE_DIR, original_folder)
    parent_dir = os.path.dirname(abs_folder)
    
    current_name = os.path.basename(abs_folder)
    current_safe = secure_filename(current_name)
    new_safe = secure_filename(new_title)
    
    final_folder = abs_folder
    
    if new_title and new_safe != current_safe:
        new_path = os.path.join(parent_dir, new_safe)
        os.rename(abs_folder, new_path)
        final_folder = new_path
        
    # Save metadata including show_in_latest flag
    show_in_latest = request.form.get('show_in_latest') == 'true'
    # Use final title for the key
    final_title = new_title if new_title else current_name
    key = slugify(final_title)
    meta = load_product_metadata()
    if key not in meta:
        meta[key] = {}
    meta[key]['show_in_latest'] = show_in_latest
    
    # If title changed, we should ideally migrate the metadata key
    if new_title and new_safe != current_safe:
        old_key = slugify(current_name)
        if old_key in meta and old_key != key:
            meta[key] = meta[old_key]
            del meta[old_key]
            # Ensure the new flag is updated in the migrated entry too
            meta[key]['show_in_latest'] = show_in_latest

    save_product_metadata(meta)
        
    regenerate_data_js()
    return jsonify({'success': True, 'new_folder_path': os.path.relpath(final_folder, BASE_DIR).replace(os.sep, '/')})

@app.route('/api/product/image/add', methods=['POST'])
@login_required
def add_product_image():
    folder_path = request.form.get('folder_path')
    file = request.files.get('image')
    
    if not folder_path or not file:
         return jsonify({'error': 'Missing data'}), 400
         
    abs_path = os.path.join(BASE_DIR, folder_path)
    if not os.path.exists(abs_path):
        return jsonify({'error': 'Product path not found'}), 404
        
    filename = safe_filename(file.filename)
    file.save(os.path.join(abs_path, filename))
    
    regenerate_data_js()
    return jsonify({'success': True})

@app.route('/api/product/image/delete', methods=['POST'])
@login_required
def delete_product_image():
    image_path = request.json.get('image_path') # relative web path e.g. images/Cat/Sub/Prod/img.webp
    
    if not image_path:
        return jsonify({'error': 'Missing image path'}), 400
        
    abs_path = os.path.join(BASE_DIR, image_path)
    
    # Security check
    if not os.path.abspath(abs_path).startswith(os.path.abspath(IMAGES_DIR)):
         return jsonify({'error': 'Invalid path'}), 400
         
    if os.path.exists(abs_path):
        os.remove(abs_path)
        regenerate_data_js()
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Image not found'}), 404

@app.route('/api/product/delete', methods=['POST'])
@login_required
def delete_product():
    folder_path = request.json.get('folder_path')
    
    if not folder_path:
        return jsonify({'error': 'Missing folder path'}), 400
        
    abs_path = os.path.join(BASE_DIR, folder_path)
    
    if not os.path.abspath(abs_path).startswith(os.path.abspath(IMAGES_DIR)):
         return jsonify({'error': 'Invalid path'}), 400
         
    if os.path.exists(abs_path):
        try:
            shutil.rmtree(abs_path)
            regenerate_data_js()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Product not found'}), 404

@app.route('/api/thumbnail/set', methods=['POST'])
@login_required
def set_thumbnail():
    data = request.json
    type_ = data.get('type') # product, category, subcategory
    key = data.get('key')
    image_path = data.get('image_path')
    
    if not type_ or not key or not image_path:
        return jsonify({'error': 'Missing fields'}), 400
        
    meta_path = 'thumbnail_metadata.json'
    meta = {}
    if os.path.exists(meta_path):
         with open(meta_path, 'r') as f:
             try: meta = json.load(f)
             except: pass
             
    if 'products' not in meta: meta['products'] = {}
    if 'categories' not in meta: meta['categories'] = {}
    if 'subcategories' not in meta: meta['subcategories'] = {}
    
    if type_ == 'product':
        meta['products'][key] = image_path
    elif type_ == 'category':
        meta['categories'][key] = image_path
    elif type_ == 'subcategory':
        meta['subcategories'][key] = image_path
        
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=4)
        
    regenerate_data_js() # Logic updated to include thumbnails
    return jsonify({'success': True})

# --- Utils ---

def bust_html_caches():
    html_files = glob.glob(os.path.join(BASE_DIR, '*.html'))
    timestamp = str(int(time.time()))
    for file_path in html_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            content = re.sub(r'(data\.js\?v=)[0-9a-zA-Z\.]+', r'\g<1>' + timestamp, content)
            content = re.sub(r'(thumbnails\.js\?v=)[0-9a-zA-Z\.]+', r'\g<1>' + timestamp, content)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        except Exception as e:
            print(f"Error busting cache for {file_path}: {e}")

def regenerate_data_js():
    # Execute generation scripts using the current python interpreter
    subprocess.call([sys.executable, 'generate_data.py'], cwd=BASE_DIR)
    subprocess.call([sys.executable, 'generate_thumbnails.py'], cwd=BASE_DIR)
    bust_html_caches()

import uuid

def load_product_metadata():
    meta_path = os.path.join(BASE_DIR, 'product_metadata.json')
    if not os.path.exists(meta_path):
        return {}
    try:
        with open(meta_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

def save_product_metadata(meta):
    meta_path = os.path.join(BASE_DIR, 'product_metadata.json')
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=4)

@app.route('/api/variant/save', methods=['POST'])
@login_required
def save_variant():
    data = request.json
    product_key = data.get('product_key')
    variant_id = data.get('variant_id')
    variant_name = data.get('variant_name')
    images = data.get('images', [])
    
    if not product_key or not variant_name or not images:
        return jsonify({'error': 'Missing required variant data'}), 400
        
    meta = load_product_metadata()
    
    if product_key not in meta:
        meta[product_key] = {}
        
    if 'variants' not in meta[product_key]:
        meta[product_key]['variants'] = []
        
    if not variant_id:
        variant_id = 'var_' + uuid.uuid4().hex[:8]
        meta[product_key]['variants'].append({
            'id': variant_id,
            'name': variant_name,
            'images': images
        })
    else:
        updated = False
        for v in meta[product_key]['variants']:
            if v.get('id') == variant_id:
                v['name'] = variant_name
                v['images'] = images
                updated = True
                break
        if not updated:
            return jsonify({'error': 'Variant not found'}), 404
            
    save_product_metadata(meta)
    regenerate_data_js()
    return jsonify({'success': True, 'variant_id': variant_id})

@app.route('/api/variant/get', methods=['GET'])
@login_required
def get_variants():
    product_key = request.args.get('product_key')
    if not product_key:
        return jsonify({'error': 'Product key required'}), 400
        
    meta = load_product_metadata()
    variants = meta.get(product_key, {}).get('variants', [])
    return jsonify({'success': True, 'data': variants})

@app.route('/api/variant/delete', methods=['POST'])
@login_required
def delete_variant():
    data = request.json
    product_key = data.get('product_key')
    variant_id = data.get('variant_id')
    
    if not product_key or not variant_id:
        return jsonify({'error': 'Product key and variant ID required'}), 400
        
    meta = load_product_metadata()
    if product_key in meta and 'variants' in meta[product_key]:
        meta[product_key]['variants'] = [v for v in meta[product_key]['variants'] if v.get('id') != variant_id]
        save_product_metadata(meta)
        regenerate_data_js()
        return jsonify({'success': True})
        
    return jsonify({'error': 'Variant not found'}), 404


# --- PHP Shim Route ---
@app.route('/admin_backend.php', methods=['GET', 'POST'])
def php_shim():
    action = request.args.get('action')
    if action == 'login': return api_login()
    if action == 'logout': return api_logout()
    if action == 'list_products': return get_products()
    if action == 'subcategories': return get_subcategories()
    if action == 'add_product': return add_product()
    if action == 'edit_product': return edit_product()
    if action == 'add_image': return add_product_image()
    if action == 'delete_image': return delete_product_image()
    if action == 'delete_product': return delete_product()
    if action == 'set_thumbnail': return set_thumbnail()
    if action == 'image_upload': return add_product_image() # Alias just in case
    
    # Variant routes
    if action == 'save_variant': return save_variant()
    if action == 'get_variants': return get_variants()
    if action == 'delete_variant': return delete_variant()
    
    return jsonify({'error': 'Invalid action'}), 400

# Alias for the PHP file explicit access
@app.route('/portal-access-99.php')
def login_page_alias():
    return login_page()

# --- Specifications API Python Shim (JSON File Based) ---
SPECS_FILE_PATH = os.path.join(BASE_DIR, 'specifications.json')

def load_specs_data():
    if not os.path.exists(SPECS_FILE_PATH):
        return {"global_specs": [], "product_specs": {}, "next_id": 1}
    try:
        with open(SPECS_FILE_PATH, 'r') as f:
            return json.load(f)
    except Exception:
        return {"global_specs": [], "product_specs": {}, "next_id": 1}

def save_specs_data(data):
    with open(SPECS_FILE_PATH, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/specifications_api.php', methods=['GET', 'POST'])
def specs_api_shim():
    if request.method == 'GET':
        action = request.args.get('action')
    else:
        if request.is_json:
            data = request.json
            action = data.get('action')
        else:
            action = request.form.get('action')

    specs_data = load_specs_data()

    # 1. GET ALL SPECIFICATIONS
    if action == 'list_all' and request.method == 'GET':
        sorted_specs = sorted(specs_data.get('global_specs', []), key=lambda x: x['name'].lower())
        return jsonify({'success': True, 'data': sorted_specs})

    # 2. GET ACTIVE SPECIFICATIONS
    elif action == 'list_active' and request.method == 'GET':
        active_specs = [s for s in specs_data.get('global_specs', []) if s.get('is_active') == 1]
        sorted_specs = sorted(active_specs, key=lambda x: x['name'].lower())
        return jsonify({'success': True, 'data': sorted_specs})

    # 3. GET PRODUCT SPECIFICATIONS
    elif action == 'get_product_specs' and request.method == 'GET':
        product_key = request.args.get('product_key', '')
        if not product_key:
            return jsonify({'success': False, 'error': 'Product key required.'})
        
        product_specs = specs_data.get('product_specs', {}).get(product_key, {})
        return jsonify({'success': True, 'data': product_specs})

    # 4. ADD GLOBAL SPECIFICATION
    elif action == 'add_global_spec' and request.method == 'POST':
        data = request.json if request.is_json else request.form
        spec_name = data.get('spec_name', '').strip()
        
        if spec_name:
            # Check for duplicate
            for spec in specs_data.get('global_specs', []):
                if spec['name'].lower() == spec_name.lower():
                    return jsonify({'success': False, 'error': 'Specification already exists.'})
            
            new_id = specs_data.get('next_id', 1)
            specs_data['global_specs'].append({
                "id": new_id,
                "name": spec_name,
                "is_active": 1
            })
            specs_data['next_id'] = new_id + 1
            save_specs_data(specs_data)
            return jsonify({'success': True, 'message': 'Specification added successfully.'})
        else:
            return jsonify({'success': False, 'error': 'Specification name is required.'})

    # 5. TOGGLE GLOBAL SPECIFICATION
    elif action == 'toggle_global_spec' and request.method == 'POST':
        data = request.json if request.is_json else request.form
        spec_id = int(data.get('spec_id', 0))
        is_active = int(data.get('is_active', 0))
        
        if spec_id > 0:
            found = False
            for spec in specs_data.get('global_specs', []):
                if spec['id'] == spec_id:
                    spec['is_active'] = is_active
                    found = True
                    break
            
            if found:
                save_specs_data(specs_data)
                return jsonify({'success': True, 'message': 'Specification status updated.'})
            else:
                return jsonify({'success': False, 'error': 'Specification not found.'})
        else:
            return jsonify({'success': False, 'error': 'Invalid specification ID.'})

    # EDIT GLOBAL SPECIFICATION
    elif action == 'edit_global_spec' and request.method == 'POST':
        data = request.json if request.is_json else request.form
        spec_id = int(data.get('spec_id', 0))
        spec_name = data.get('spec_name', '').strip()
        
        if spec_id > 0 and spec_name:
            # Check for name collision
            for spec in specs_data.get('global_specs', []):
                if spec['name'].lower() == spec_name.lower() and spec['id'] != spec_id:
                    return jsonify({'success': False, 'error': 'Another specification with this name already exists.'})

            found = False
            for spec in specs_data.get('global_specs', []):
                if spec['id'] == spec_id:
                    spec['name'] = spec_name
                    found = True
                    break
            
            if found:
                save_specs_data(specs_data)
                return jsonify({'success': True, 'message': 'Specification updated successfully.'})
            else:
                return jsonify({'success': False, 'error': 'Specification not found.'})
        else:
            return jsonify({'success': False, 'error': 'Invalid specification ID or name.'})

    # DELETE GLOBAL SPECIFICATION
    elif action == 'delete_global_spec' and request.method == 'POST':
        data = request.json if request.is_json else request.form
        spec_id = int(data.get('spec_id', 0))
        
        if spec_id > 0:
            original_len = len(specs_data.get('global_specs', []))
            specs_data['global_specs'] = [s for s in specs_data.get('global_specs', []) if s['id'] != spec_id]
            
            if len(specs_data['global_specs']) < original_len:
                # Remove this spec from all product specs
                if 'product_specs' in specs_data:
                    for pkey, specs in list(specs_data['product_specs'].items()):
                        # Dictionary keys are strings
                        str_spec_id = str(spec_id)
                        if str_spec_id in specs:
                            del specs[str_spec_id]
                            # Clean up empty specs dicts
                            if not specs:
                                del specs_data['product_specs'][pkey]

                save_specs_data(specs_data)
                return jsonify({'success': True, 'message': 'Specification deleted successfully.'})
            else:
                return jsonify({'success': False, 'error': 'Specification not found.'})
        else:
            return jsonify({'success': False, 'error': 'Invalid specification ID.'})

    # 6. SAVE PRODUCT SPECIFICATIONS
    elif action == 'save_product_specs' and request.method == 'POST':
        data = request.json if request.is_json else request.form
        product_key = data.get('product_key', '')
        specs_array = data.get('specs', {})

        if not product_key:
            return jsonify({'success': False, 'error': 'Product key is required.'})

        if 'product_specs' not in specs_data:
            specs_data['product_specs'] = {}
            
        # Clean array to only non-empty strings
        cleaned_specs = {}
        if isinstance(specs_array, dict):
            for spec_id, spec_val in specs_array.items():
                val = str(spec_val).strip()
                if val:
                    cleaned_specs[str(spec_id)] = val
        
        specs_data['product_specs'][product_key] = cleaned_specs
        save_specs_data(specs_data)
        
        # Also let's optionally trigger generate_data.py if it ever needed it, 
        # but our specifications are loaded client-side independently right now.
        
        return jsonify({'success': True, 'message': 'Product specifications saved.'})

    else:
        return jsonify({'error': 'Invalid action'}), 400

if __name__ == '__main__':
    app.run(port=8000, debug=True)

