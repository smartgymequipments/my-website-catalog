# Deployment Guide for Hostinger

I have converted the python admin panel to **PHP**, which is fully compatible with Hostinger Shared Hosting out of the box.

## Steps to Deploy

1.  **File Manager**:
    -   Log in to your Hostinger Control Panel (hPanel).
    -   Go to **File Manager**.
    -   Navigate to `public_html`.

2.  **Upload Files**:
    -   Upload **ALL** files and folders from your local project folder to `public_html`.
    -   Ensure you include the new files I created:
        -   `admin_backend.php` (The backend logic)
        -   `portal-access-99.php` (The login page)
        -   `forgot-password.php` (Forgot Password page)
        -   `reset-password.php` (Reset Password page)
        -   `admin_config.json` (Configuration file)
        -   `admin.js` (Updated logic)
        -   `script.js` (Updated search logic)
        -   `dashboard.html` (Updated dashboard)
    -   Also ensure `images/` folder and `data.js` are uploaded.

3.  **Permissions (Important)**:
    -   For the Admin Panel to work (upload images, add products, reset passwords), the server needs **Write Permissions**.
    -   In Hostinger File Manager, right-click the `images` folder.
    -   Select **Attributes** or **Permissions**.
    -   Ensure it is set to **755** or **777** (if 755 doesn't work).
    -   Also ensure `data.js`, `admin_config.json`, and the root directory (to create `reset_tokens.json` and `product_metadata.json`) have Write Permissions.
    -   **Pro Tip**: If features fail, create empty files named `reset_tokens.json` and `product_metadata.json` and set their permissions to 777.

4.  **Access**:
    -   Go to your website.
    -   Type **"khamrade"** in search.
    -   Or go directly to `yourdomain.com/portal-access-99.php`.
    -   Login with `admin` / `password123`.

## Note
The Python files (`admin_server.py`, `generate_data.py`) are **NOT** needed on Hostinger. You can skip uploading them.
