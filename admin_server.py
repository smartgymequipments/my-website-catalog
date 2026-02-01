
import http.server
import socketserver
import json

import os

import shutil
import base64
import random
import string
import subprocess
import sys

# Configuration
PORT = 8000
ADMIN_PASSWORD = "admin"  # Simple password for local use
SESSION_TOKEN = "".join(random.choices(string.ascii_letters + string.digits, k=32))
DESCRIPTIONS_FILE = 'descriptions.json'

class AdminRequestHandler(http.server.SimpleHTTPRequestHandler):
    
    def do_GET(self):
        if self.path == '/api/check-auth':
            self.handle_check_auth()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/login':
            self.handle_login()
        elif self.path == '/api/publish':
            self.handle_publish()
        elif self.path == '/api/update-product':
            self.handle_update_product()
        elif self.path == '/api/upload-image':
            self.handle_upload_image()
        elif self.path == '/api/add-category':
            self.handle_add_category()
        elif self.path == '/api/delete-category':
            self.handle_delete_category()
        elif self.path == '/api/list-categories':
            self.handle_list_categories()
        elif self.path == '/api/list-subcategories':
            self.handle_list_subcategories()
        elif self.path == '/api/add-subcategory':
            self.handle_add_subcategory()
        elif self.path == '/api/delete-subcategory':
            self.handle_delete_subcategory()
        elif self.path == '/api/deploy-github':
            self.handle_deploy_github()
        else:
            self.send_error(404, "API Endpoint not found")

    def handle_deploy_github(self):
        if not self.check_token(): return
        
        try:
            # 1. Git Add
            subprocess.run(["git", "add", "."], check=True, capture_output=True)
            
            # 2. Git Commit (allow empty if nothing changed, but usually check=True fails if nothing staged? 
            # Actually, commit returns 1 if nothing to commit unless we allow empty. 
            # Better: check status first or just ignore error on commit if "clean")
            proc_commit = subprocess.run(["git", "commit", "-m", "Auto-update from Admin Portal"], capture_output=True, text=True)
            
            # 3. Git Push
            # Note: This requires credentials to be cached or SSH key setup!
            proc_push = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
            
            if proc_push.returncode == 0:
                self.send_json_response({'success': True, 'message': 'Pushed to GitHub successfully!'})
            else:
                 self.send_json_response({'success': False, 'message': f'Push failed: {proc_push.stderr}'}, 500)
                 
        except Exception as e:
            self.send_json_response({'success': False, 'message': str(e)}, 500)


    def handle_list_categories(self):
        if not self.check_token(): return
        
        images_dir = os.path.join(os.getcwd(), 'images')
        if not os.path.exists(images_dir):
            self.send_json_response({'success': True, 'categories': []})
            return

        try:
            # List directories only
            cats = [d for d in os.listdir(images_dir) if os.path.isdir(os.path.join(images_dir, d))]
            cats.sort()
            self.send_json_response({'success': True, 'categories': cats})
        except Exception as e:
            self.send_json_response({'success': False, 'message': str(e)}, 500)

    def handle_list_subcategories(self):
        if not self.check_token(): return
        
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8')
        data = json.loads(body)
        
        category = data.get('category')
        if not category:
            self.send_json_response({'success': False, 'message': 'Category required'}, 400)
            return
            
        cat_dir = os.path.join(os.getcwd(), 'images', category)
        if not os.path.exists(cat_dir):
             self.send_json_response({'success': False, 'message': 'Category not found'}, 404)
             return

        try:
            subs = [d for d in os.listdir(cat_dir) if os.path.isdir(os.path.join(cat_dir, d))]
            subs.sort()
            self.send_json_response({'success': True, 'subcategories': subs})
        except Exception as e:
            self.send_json_response({'success': False, 'message': str(e)}, 500)

    def handle_add_subcategory(self):
        if not self.check_token(): return
        
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8')
        data = json.loads(body)
        
        category = data.get('category')
        subcategory = data.get('subcategory')
        
        if not category or not subcategory:
            self.send_json_response({'success': False, 'message': 'Category and Subcategory required'}, 400)
            return

        def clean(s): return "".join([c for c in s if c.isalpha() or c.isdigit() or c in (' ', '-', '_')]).strip()
        cat_clean = clean(category) # Assuming category folder name is clean, but maybe passed raw?
        # Actually logic depends if we pass raw name or folder name. 
        # For safety, let's assume we pass what we got from list-categories which is folder name.
        # But if user typed it? Let's clean subcategory.
        
        # We need to find the REAL directory matching 'category' if casing differs? 
        # For now assume exact match or simple clean.
        
        sub_clean = clean(subcategory)
        
        target_dir = os.path.join(os.getcwd(), 'images', category, sub_clean)
        
        if os.path.exists(target_dir):
             self.send_json_response({'success': False, 'message': 'Subcategory already exists'}, 400)
             return

        try:
            os.makedirs(target_dir)
            self.send_json_response({'success': True})
        except Exception as e:
            self.send_json_response({'success': False, 'message': str(e)}, 500)

    def handle_delete_subcategory(self):
        if not self.check_token(): return
        
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8')
        data = json.loads(body)
        
        category = data.get('category')
        subcategory = data.get('subcategory')
        
        if not category or not subcategory:
            self.send_json_response({'success': False, 'message': 'Category and Subcategory required'}, 400)
            return

        target_dir = os.path.join(os.getcwd(), 'images', category, subcategory)
        
        if not os.path.exists(target_dir):
            self.send_json_response({'success': False, 'message': 'Subcategory not found'}, 404)
            return
            
        try:
            shutil.rmtree(target_dir)
            self.send_json_response({'success': True})
        except Exception as e:
            self.send_json_response({'success': False, 'message': str(e)}, 500) 


    def handle_add_category(self):
        if not self.check_token(): return
        
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8')
        data = json.loads(body)
        
        category = data.get('category')
        if not category:
            self.send_json_response({'success': False, 'message': 'Category name required'}, 400)
            return

        def clean(s): return "".join([c for c in s if c.isalpha() or c.isdigit() or c in (' ', '-', '_')]).strip()
        cat_clean = clean(category)
        
        target_dir = os.path.join(os.getcwd(), 'images', cat_clean)
        
        if os.path.exists(target_dir):
            self.send_json_response({'success': False, 'message': 'Category already exists'}, 400)
            return
            
        try:
            os.makedirs(target_dir)
            self.send_json_response({'success': True})
        except Exception as e:
            self.send_json_response({'success': False, 'message': str(e)}, 500)

    def handle_delete_category(self):
        if not self.check_token(): return
        
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8')
        data = json.loads(body)
        
        category = data.get('category')
        if not category:
            self.send_json_response({'success': False, 'message': 'Category name required'}, 400)
            return

        target_dir = os.path.join(os.getcwd(), 'images', category)
        
        if not os.path.exists(target_dir):
            self.send_json_response({'success': False, 'message': 'Category not found'}, 404)
            return
            
        try:
            shutil.rmtree(target_dir)
            self.send_json_response({'success': True})
        except Exception as e:
            self.send_json_response({'success': False, 'message': str(e)}, 500)



    def handle_login(self):
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8')
        try:
            data = json.loads(body)
            password = data.get('password')
            if password == ADMIN_PASSWORD:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {'success': True, 'token': SESSION_TOKEN}
                self.wfile.write(json.dumps(response).encode('utf-8'))
            else:
                self.send_response(401)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'message': 'Invalid Password'}).encode('utf-8'))
        except:
            self.send_error(400, "Invalid Request")

    def handle_check_auth(self):
        # For simplicity in this local server, we check the Authorization header
        auth_header = self.headers.get('Authorization')
        if auth_header == f"Bearer {SESSION_TOKEN}":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
        else:
            self.send_response(401)
            self.end_headers()

    def handle_publish(self):
        if not self.check_token(): return
        
        try:
            # Run generate_data.py
            result = subprocess.run([sys.executable, 'generate_data.py'], capture_output=True, text=True)
            # Run generate_thumbnails.py
            subprocess.run([sys.executable, 'generate_thumbnails.py'], capture_output=True, text=True)
            
            if result.returncode == 0:
                self.send_json_response({'success': True, 'message': 'Data regenerated successfully'})
            else:
                self.send_json_response({'success': False, 'message': f'Error: {result.stderr}'}, 500)
        except Exception as e:
            self.send_json_response({'success': False, 'message': str(e)}, 500)

    def handle_update_product(self):
        if not self.check_token(): return
        
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8')
        data = json.loads(body)
        
        product_key = data.get('key')
        description = data.get('description', '')
        specs = data.get('specs', {})
        
        if not product_key:
            self.send_json_response({'success': False, 'message': 'Missing product key'}, 400)
            return

        # Load existing descriptions
        descriptions = {}
        if os.path.exists(DESCRIPTIONS_FILE):
            try:
                with open(DESCRIPTIONS_FILE, 'r', encoding='utf-8') as f:
                    descriptions = json.load(f)
            except:
                pass
        
        # Update
        if product_key not in descriptions:
            descriptions[product_key] = {}
            
        descriptions[product_key]['description'] = description
        descriptions[product_key]['specs'] = specs
        
        # Save
        with open(DESCRIPTIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(descriptions, f, indent=4)
            
        self.send_json_response({'success': True})


    def handle_upload_image(self):
        if not self.check_token(): return

        content_type = self.headers.get('Content-Type')
        if not content_type or 'multipart/form-data' not in content_type:
            self.send_json_response({'success': False, 'message': 'Content-Type must be multipart/form-data'}, 400)
            return

        import email.parser
        from io import BytesIO

        # Wrap the input in a BytesIO for parsing
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        # Create headers for the parser
        headers = f"Content-Type: {content_type}\r\n"
        msg = email.parser.BytesParser().parsebytes(headers.encode('ascii') + b"\r\n" + body)

        if not msg.is_multipart():
            self.send_json_response({'success': False, 'message': 'Multipart data required'}, 400)
            return
            
        file_data = None
        filename = None
        category = None
        subcategory = None
        name = None
        
        for part in msg.get_payload():
            cd = part.get('Content-Disposition')
            if not cd: continue
            
            # Simple parsing of Content-Disposition
            disposition_dict = {}
            for item in cd.split(';'):
                if '=' in item:
                    key, value = item.strip().split('=', 1)
                    disposition_dict[key] = value.strip('"')

            field_name = disposition_dict.get('name')
            
            if field_name == 'image':
                filename = disposition_dict.get('filename')
                if filename:
                    file_data = part.get_payload(decode=True)
            elif field_name == 'category':
                category = part.get_payload(decode=True).decode('utf-8')
            elif field_name == 'subcategory':
                subcategory = part.get_payload(decode=True).decode('utf-8')
            elif field_name == 'name':
                name = part.get_payload(decode=True).decode('utf-8')

        if not file_data or not category or not subcategory or not name:
             self.send_json_response({'success': False, 'message': f'Missing fields: {filename}, {category}, {subcategory}, {name}'}, 400)
             return
            
        # Construct path: images/Category/Subcategory/Name/filename
        def clean(s): return "".join([c for c in s if c.isalpha() or c.isdigit() or c in (' ', '-', '_')]).strip()
        
        cat_clean = clean(category)
        sub_clean = clean(subcategory)
        name_clean = clean(name)
        filename_clean = os.path.basename(filename) # basic security
        
        target_dir = os.path.join(os.getcwd(), 'images', cat_clean, sub_clean, name_clean)
        os.makedirs(target_dir, exist_ok=True)
        
        target_path = os.path.join(target_dir, filename_clean)
        
        with open(target_path, 'wb') as f:
            f.write(file_data)
            
        self.send_json_response({'success': True, 'path': target_path})


    def check_token(self):
        auth_header = self.headers.get('Authorization')
        if auth_header != f"Bearer {SESSION_TOKEN}":
            self.send_response(401)
            self.end_headers()
            return False
        return True

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

print(f"Starting Admin Server on port {PORT}...")
print(f"Open http://localhost:{PORT}/portal-access-99.html to log in.")
print(f"Password: {ADMIN_PASSWORD}")

with socketserver.TCPServer(("", PORT), AdminRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()
