<?php
session_start();

// Configuration
$CONFIG_FILE = __DIR__ . '/admin_config.json';
$RESET_TOKENS_FILE = __DIR__ . '/reset_tokens.json';
$METADATA_FILE = __DIR__ . '/product_metadata.json';
$THUMBNAIL_METADATA_FILE = __DIR__ . '/thumbnail_metadata.json';
$IMAGES_DIR = __DIR__ . '/images';
$DATA_JS_FILE = __DIR__ . '/data.js';
$THUMBNAILS_JS_FILE = __DIR__ . '/thumbnails.js';

// Default Config if missing
$DEFAULT_CONFIG = [
    'username' => 'admin',
    'password_hash' => 'password123', // Initial fallback
    'email' => 'smartgymequipments@gmail.com'
];

// Helper: Load Config
function loadConfig() {
    global $CONFIG_FILE, $DEFAULT_CONFIG;
    if (file_exists($CONFIG_FILE)) {
        return json_decode(file_get_contents($CONFIG_FILE), true);
    }
    return $DEFAULT_CONFIG;
}

// Helper: Save Config
function saveConfig($config) {
    global $CONFIG_FILE;
    file_put_contents($CONFIG_FILE, json_encode($config, JSON_PRETTY_PRINT));
}

// Helper: Load Tokens
function loadTokens() {
    global $RESET_TOKENS_FILE;
    if (file_exists($RESET_TOKENS_FILE)) {
        return json_decode(file_get_contents($RESET_TOKENS_FILE), true);
    }
    return [];
}

// Helper: Save Tokens
function saveTokens($tokens) {
    global $RESET_TOKENS_FILE;
    file_put_contents($RESET_TOKENS_FILE, json_encode($tokens, JSON_PRETTY_PRINT));
}

// Helper: Load Metadata
function loadMetadata() {
    global $METADATA_FILE;
    if (file_exists($METADATA_FILE)) {
        return json_decode(file_get_contents($METADATA_FILE), true);
    }
    return [];
}

// Helper: Save Metadata
function saveMetadata($meta) {
    global $METADATA_FILE;
    file_put_contents($METADATA_FILE, json_encode($meta, JSON_PRETTY_PRINT));
}

// Helper: Load Thumbnail Metadata
function loadThumbnailMetadata() {
    global $THUMBNAIL_METADATA_FILE;
    if (file_exists($THUMBNAIL_METADATA_FILE)) {
        return json_decode(file_get_contents($THUMBNAIL_METADATA_FILE), true);
    }
    return ['products' => [], 'categories' => [], 'subcategories' => []];
}

// Helper: Save Thumbnail Metadata
function saveThumbnailMetadata($meta) {
    global $THUMBNAIL_METADATA_FILE;
    file_put_contents($THUMBNAIL_METADATA_FILE, json_encode($meta, JSON_PRETTY_PRINT));
}

// Response Helper
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Slugify Helper
function slugify($text) {
    return strtolower(preg_replace('/[\s]+/', '-', $text));
}

// Safe Filename Helper
function safe_filename($filename) {
    return basename($filename);
}

// Convert to WebP Helper
function convertToWebp($source, $destination, $quality = 85) {
    $info = @getimagesize($source);
    if (!$info) return false;

    $mime = $info['mime'];
    $image = null;

    switch ($mime) {
        case 'image/jpeg':
            $image = @imagecreatefromjpeg($source);
            break;
        case 'image/gif':
            $image = @imagecreatefromgif($source);
            break;
        case 'image/png':
            $image = @imagecreatefrompng($source);
            if ($image) {
                // Preserve transparency
                imagepalettetotruecolor($image);
                imagealphablending($image, true);
                imagesavealpha($image, true);
            }
            break;
        case 'image/webp':
            // Already webp, just move it later or re-compress
            $image = @imagecreatefromwebp($source);
            break;
        default:
            return false;
    }

    if (!$image) return false;

    // Save as WebP
    $success = imagewebp($image, $destination, $quality);
    imagedestroy($image);

    return $success;
}

// Data Generation Logic
function regenerateThumbnailsJs($data) {
    global $THUMBNAILS_JS_FILE;
    $meta = loadThumbnailMetadata();
    $thumbnailMap = [];

    // 1. Products
    foreach ($data as $key => $item) {
        $thumbPath = null;
        // Manual Override
        if (isset($meta['products'][$key])) {
            $thumbPath = $meta['products'][$key];
        } 
        // Fallback to first image
        elseif (!empty($item['images'])) {
            $thumbPath = $item['images'][0];
        }

        if ($thumbPath) {
            $thumbnailMap[$key] = $thumbPath;
        }
    }

    // 2. Categories
    if (isset($meta['categories'])) {
        foreach ($meta['categories'] as $cat => $path) {
            $thumbnailMap["category:$cat"] = $path;
        }
    }

    // 3. Subcategories
    if (isset($meta['subcategories'])) {
        foreach ($meta['subcategories'] as $sub => $path) {
            $thumbnailMap["subcategory:$sub"] = $path;
        }
    }

    $jsContent = 'const thumbnailData = ' . json_encode($thumbnailMap, JSON_PRETTY_PRINT) . ';';
    file_put_contents($THUMBNAILS_JS_FILE, $jsContent);
}

function regenerateDataJs($imagesDir, $outputFile) {
    $data = [];
    $metadata = loadMetadata();
    
    if (is_dir($imagesDir)) {
        $categories = array_filter(scandir($imagesDir), function($item) use ($imagesDir) {
            return $item !== '.' && $item !== '..' && is_dir($imagesDir . '/' . $item);
        });

        foreach ($categories as $category) {
            $catPath = $imagesDir . '/' . $category;
            $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($catPath));
            $productGroups = []; 

            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $ext = strtolower($file->getExtension());
                    if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'ogg', 'mov'])) {
                        $dir = dirname($file->getPathname());
                        if (!isset($productGroups[$dir])) {
                            $productGroups[$dir] = [];
                        }
                        $productGroups[$dir][] = $file->getPathname();
                    }
                }
            }

            foreach ($productGroups as $dirPath => $images) {
                $equipmentName = basename($dirPath);
                $relFromCat = trim(str_replace($catPath, '', $dirPath), '\\/');
                $parts = explode('/', str_replace('\\', '/', $relFromCat));
                
                $subcategory = "General";
                if ($relFromCat && $relFromCat !== '.') {
                    $subcategory = $parts[0];
                }
                
                if (in_array(strtolower($category), ['plate loaded equipments', 'selectorized equipments'])) {
                     if (!str_ends_with(strtolower($subcategory), 'machines')) {
                         $subcategory .= " Machines";
                     }
                }

                $key = slugify($equipmentName);
                if (isset($data[$key])) {
                    $key = $key . '-' . slugify($category);
                }

                $webImages = [];
                sort($images);
                foreach ($images as $imgAbsPath) {
                    $rel = str_replace(str_replace('\\', '/', __DIR__) . '/', '', str_replace('\\', '/', $imgAbsPath));
                    $webImages[] = $rel;
                }
                
                // Add Date Metadata
                $dateAdded = $metadata[$key]['created_at'] ?? 0;
                if (!$dateAdded && is_dir($dirPath)) {
                    $dateAdded = filemtime($dirPath);
                }

                // Check for YouTube URL
                $youtubeUrl = '';
                $ytFile = $dirPath . '/youtube.txt';
                if (file_exists($ytFile)) {
                    $youtubeUrl = trim(file_get_contents($ytFile));
                }

                $data[$key] = [
                    'name' => $equipmentName,
                    'category' => $category,
                    'subcategory' => $subcategory,
                    'images' => $webImages,
                    'youtube' => $youtubeUrl,
                    'date_added' => $dateAdded
                ];
            }
        }
    }

    $jsContent = 'const equipmentData = ' . json_encode($data, JSON_PRETTY_PRINT) . ';';
    file_put_contents($outputFile, $jsContent);
    
    // Also regenerate thumbnails
    regenerateThumbnailsJs($data);
}


// --- ROUTING ---

$action = $_GET['action'] ?? '';

// Public: Login
if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $config = loadConfig();
    
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if ($username === $config['username']) {
        // Check hash
        if (password_verify($password, $config['password_hash'])) {
            $_SESSION['logged_in'] = true;
            jsonResponse(['success' => true]);
        } 
        // Fallback: Check plain text (Auto-Upgrade)
        elseif ($password === $config['password_hash']) {
            $config['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
            saveConfig($config);
            $_SESSION['logged_in'] = true;
            jsonResponse(['success' => true]);
        }
    }
    
    jsonResponse(['success' => false], 401);
}

// Public: Logout
if ($action === 'logout') {
    session_destroy();
    jsonResponse(['success' => true]);
}

// Public: Forgot Password
if ($action === 'forgot_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    
    // We only send to the configured admin email for security
    $config = loadConfig();
    $adminEmail = $config['email'] ?? 'smartgymequipments@gmail.com'; // Default if missing
    
    if (strtolower(trim($email)) === strtolower(trim($adminEmail))) {
        // Generate Token
        $token = bin2hex(random_bytes(32));
        $tokens = loadTokens();
        // Remove old tokens for this email or cleanup
        $tokens[$token] = [
            'email' => $adminEmail,
            'expires' => time() + 3600 // 1 hour
        ];
        saveTokens($tokens);
        
        // Send Email
        $resetLink = (isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]" . dirname($_SERVER['PHP_SELF']) . "/reset-password.php?token=$token";
        
        $subject = "Admin Password Reset - Smart Gym Equipments";
        $message = "Click the following link to reset your password: $resetLink";
        $headers = "From: no-reply@smartgymequipments.com";
        
        mail($adminEmail, $subject, $message, $headers);
        
        jsonResponse(['success' => true, 'message' => 'Reset link sent to your email.']);
    } else {
        // Generic response for security
        jsonResponse(['success' => true, 'message' => 'If that email is registered, a link has been sent.']);
    }
}

// Public: Reset Password
if ($action === 'reset_password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $token = $input['token'] ?? '';
    $newPass = $input['password'] ?? '';
    
    if (!$token || !$newPass) jsonResponse(['error' => 'Missing fields'], 400);
    
    $tokens = loadTokens();
    if (isset($tokens[$token]) && $tokens[$token]['expires'] > time()) {
        // Valid
        $config = loadConfig();
        $config['password_hash'] = password_hash($newPass, PASSWORD_DEFAULT);
        saveConfig($config);
        
        // Invalidate token
        unset($tokens[$token]);
        saveTokens($tokens);
        
        jsonResponse(['success' => true]);
    } else {
        jsonResponse(['error' => 'Invalid or expired token'], 400);
    }
}


// --- PROTECTED ROUTES ---
if (!isset($_SESSION['logged_in'])) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

// CRUD Operations (List, Add, Edit, Delete, Subcats)
if ($action === 'list_products') {
    // ... (Same as before) ...
    $products = [];
    if (is_dir($IMAGES_DIR)) {
        $categories = array_diff(scandir($IMAGES_DIR), ['.', '..']);
        foreach ($categories as $category) {
            $catPath = $IMAGES_DIR . '/' . $category;
            if (!is_dir($catPath)) continue;

            $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($catPath));
            $groups = [];
            foreach ($iterator as $file) {
                 if ($file->isFile() && in_array(strtolower($file->getExtension()), ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'ogg', 'mov'])) {
                    $d = dirname($file->getPathname());
                    if (!isset($groups[$d])) $groups[$d] = [];
                    $groups[$d][] = $file->getPathname();
                 }
            }

            foreach ($groups as $dirPath => $images) {
                $folderPath = str_replace(str_replace('\\', '/', __DIR__) . '/', '', str_replace('\\', '/', $dirPath));
                $relFromCat = trim(str_replace($catPath, '', $dirPath), '\\/');
                $parts = explode('/', str_replace('\\', '/', $relFromCat));
                $sub = ($relFromCat && $relFromCat !== '.') ? $parts[0] : "General";

                $imgPaths = [];
                sort($images);
                foreach ($images as $i) {
                     $imgPaths[] = str_replace(str_replace('\\', '/', __DIR__) . '/', '', str_replace('\\', '/', $i));
                }

                $products[] = [
                    'key' => slugify(basename($dirPath)),
                    'name' => basename($dirPath),
                    'category' => $category,
                    'subcategory' => $sub,
                    'images' => $imgPaths,
                    'folder_path' => $folderPath
                ];
            }
        }
    }
    jsonResponse($products);
}

if ($action === 'subcategories') {
    // ...
    $cat = $_GET['category'] ?? '';
    if (!$cat) jsonResponse([]);
    $path = $IMAGES_DIR . '/' . $cat;
    if (!is_dir($path)) jsonResponse([]);
    $subs = ['General'];
    $dirs = array_diff(scandir($path), ['.', '..']);
    foreach ($dirs as $d) { if (is_dir($path . '/' . $d)) $subs[] = $d; }
    jsonResponse(array_values(array_unique($subs)));
}

if ($action === 'add_product' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $title = $_POST['title'] ?? '';
    $category = $_POST['category'] ?? '';
    $subcategory = $_POST['subcategory'] ?? '';
    
    if (!$title || !$category || empty($_FILES['images']['name'][0])) jsonResponse(['error' => 'Missing fields'], 400);

    $safeTitle = preg_replace('/[^a-zA-Z0-9_\-\. ]/', '_', trim($title));
    
    // Ensure Category Dir Exists
    $catDir = $IMAGES_DIR . '/' . $category;
    if (!is_dir($catDir)) mkdir($catDir, 0777, true);

    $targetDir = $catDir;
    if ($subcategory && $subcategory !== 'General') {
        $targetDir .= '/' . $subcategory;
        // Ensure Subcategory Dir Exists
        if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);
    }
    
    $productDir = $targetDir . '/' . $safeTitle;

    if (!is_dir($productDir)) mkdir($productDir, 0777, true);

    // Handle Multiple Images
    if (!empty($_FILES['images']['name'][0])) {
        $count = count($_FILES['images']['name']);
        for ($i = 0; $i < $count; $i++) {
            $error = $_FILES['images']['error'][$i];
            if ($error !== UPLOAD_ERR_OK) {
                $msg = 'Upload failed';
                switch ($error) {
                    case UPLOAD_ERR_INI_SIZE: $msg = 'File too large (server limit)'; break;
                    case UPLOAD_ERR_FORM_SIZE: $msg = 'File too large (form limit)'; break;
                    case UPLOAD_ERR_PARTIAL: $msg = 'File only partially uploaded'; break;
                    case UPLOAD_ERR_NO_FILE: $msg = 'No file uploaded'; break;
                    case UPLOAD_ERR_NO_TMP_DIR: $msg = 'Missing temporary folder'; break;
                    case UPLOAD_ERR_CANT_WRITE: $msg = 'Failed to write to disk'; break;
                    case UPLOAD_ERR_EXTENSION: $msg = 'File upload stopped by extension'; break;
                }
                jsonResponse(['error' => "Image $i: $msg"], 400);
            }

            $name = $_FILES['images']['name'][$i];
            $tmp = $_FILES['images']['tmp_name'][$i];
            
            if ($name) {
                $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                
                // If it's a video, just move it normally
                if (in_array($ext, ['mp4', 'webm', 'ogg', 'mov'])) {
                    $filename = safe_filename($name);
                    if (!move_uploaded_file($tmp, $productDir . '/' . $filename)) {
                        jsonResponse(['error' => "Failed to move uploaded video: $name"], 500);
                    }
                } else {
                    // Try to convert to WebP
                    $filenameWithoutExt = pathinfo($name, PATHINFO_FILENAME);
                    $safeBaseName = safe_filename($filenameWithoutExt);
                    $webpFilename = $safeBaseName . '.webp';
                    $destPath = $productDir . '/' . $webpFilename;

                    if (!convertToWebp($tmp, $destPath, 85)) {
                        // Fallback: move original if conversion fails
                        $filename = safe_filename($name);
                        if (!move_uploaded_file($tmp, $productDir . '/' . $filename)) {
                            jsonResponse(['error' => "Failed to move uploaded file and conversion failed: $name"], 500);
                        }
                    }
                }
            }
        }
    } else {
        // Fallback or Error
        // Check if there was a global error (e.g. post_max_size exceeded causing empty $_FILES)
        if (empty($_FILES) && $_SERVER['CONTENT_LENGTH'] > 0) {
            jsonResponse(['error' => 'Post size exceeded limit'], 400);
        }
    }

    // Save YouTube URL if provided
    $youtubeUrl = $_POST['youtube_url'] ?? '';
    if ($youtubeUrl) {
        file_put_contents($productDir . '/youtube.txt', $youtubeUrl);
    }

    // Save Creation Date
    $meta = loadMetadata();
    $key = slugify($safeTitle);
    // Handle potential key collision (though mkdir would fail usually)
    if (isset($meta[$key])) {
        $key = $key . '-' . slugify($category);
    }
    
    $meta[$key] = [
        'created_at' => time()
    ];
    saveMetadata($meta);

    regenerateDataJs($IMAGES_DIR, $DATA_JS_FILE);
    jsonResponse(['success' => true]);
}

if ($action === 'add_image' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $folderPath = $_POST['folder_path'] ?? '';
    if (!$folderPath || empty($_FILES['images']['name'][0])) jsonResponse(['error' => 'Missing data'], 400);

    $absPath = __DIR__ . '/' . $folderPath;
    if (!is_dir($absPath)) jsonResponse(['error' => 'Product not found'], 404);

    // Handle Multiple Images
    if (!empty($_FILES['images']['name'][0])) {
        $count = count($_FILES['images']['name']);
        for ($i = 0; $i < $count; $i++) {
            $error = $_FILES['images']['error'][$i];
            if ($error !== UPLOAD_ERR_OK) {
                $msg = 'Upload failed';
                switch ($error) {
                    case UPLOAD_ERR_INI_SIZE: $msg = 'File too large (server limit)'; break;
                    case UPLOAD_ERR_FORM_SIZE: $msg = 'File too large (form limit)'; break;
                    case UPLOAD_ERR_PARTIAL: $msg = 'File only partially uploaded'; break;
                    case UPLOAD_ERR_NO_FILE: $msg = 'No file uploaded'; break;
                    case UPLOAD_ERR_NO_TMP_DIR: $msg = 'Missing temporary folder'; break;
                    case UPLOAD_ERR_CANT_WRITE: $msg = 'Failed to write to disk'; break;
                    case UPLOAD_ERR_EXTENSION: $msg = 'File upload stopped by extension'; break;
                }
                jsonResponse(['error' => "Image $i: $msg"], 400);
            }

            $name = $_FILES['images']['name'][$i];
            $tmp = $_FILES['images']['tmp_name'][$i];
            
            if ($name) {
                $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                
                // If it's a video, just move it normally
                if (in_array($ext, ['mp4', 'webm', 'ogg', 'mov'])) {
                    $filename = safe_filename($name);
                    if (!move_uploaded_file($tmp, $absPath . '/' . $filename)) {
                        jsonResponse(['error' => "Failed to move uploaded video: $name"], 500);
                    }
                } else {
                    // Try to convert to WebP
                    $filenameWithoutExt = pathinfo($name, PATHINFO_FILENAME);
                    $safeBaseName = safe_filename($filenameWithoutExt);
                    $webpFilename = $safeBaseName . '.webp';
                    $destPath = $absPath . '/' . $webpFilename;

                    if (!convertToWebp($tmp, $destPath, 85)) {
                        // Fallback: move original if conversion fails
                        $filename = safe_filename($name);
                        if (!move_uploaded_file($tmp, $absPath . '/' . $filename)) {
                            jsonResponse(['error' => "Failed to move uploaded file and conversion failed: $name"], 500);
                        }
                    }
                }
            }
        }
    } else {
        if (empty($_FILES) && $_SERVER['CONTENT_LENGTH'] > 0) {
            jsonResponse(['error' => 'Post size exceeded limit'], 400);
        }
    }

    regenerateDataJs($IMAGES_DIR, $DATA_JS_FILE);
    jsonResponse(['success' => true]);
}

if ($action === 'delete_image' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $imgPath = $input['image_path'] ?? '';
    
    if (!$imgPath) jsonResponse(['error' => 'Missing path'], 400);
    $absPath = __DIR__ . '/' . $imgPath;
    if (strpos(realpath($absPath), realpath($IMAGES_DIR)) !== 0) jsonResponse(['error' => 'Invalid path'], 400);

    if (file_exists($absPath)) {
        unlink($absPath);
        regenerateDataJs($IMAGES_DIR, $DATA_JS_FILE);
        jsonResponse(['success' => true]);
    }
    jsonResponse(['error' => 'Not found'], 404);
}

if ($action === 'delete_product' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $folderPath = $input['folder_path'] ?? '';
    
    if (!$folderPath) jsonResponse(['error' => 'Missing path'], 400);
    $absPath = __DIR__ . '/' . $folderPath;
    if (strpos(realpath($absPath), realpath($IMAGES_DIR)) !== 0) jsonResponse(['error' => 'Invalid path'], 400);

    function rrmdir($dir) { 
        if (is_dir($dir)) { 
            $objects = scandir($dir); 
            foreach ($objects as $object) { 
                if ($object != "." && $object != "..") { 
                    if (is_dir($dir. "/" . $object)) rrmdir($dir. "/" . $object);
                    else unlink($dir. "/" . $object); 
                } 
            }
            rmdir($dir); 
        } 
    }

    if (is_dir($absPath)) {
        rrmdir($absPath);
        regenerateDataJs($IMAGES_DIR, $DATA_JS_FILE);
        jsonResponse(['success' => true]);
    }
    jsonResponse(['error' => 'Not found'], 404);
}

if ($action === 'edit_product' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $originalFolder = $_POST['original_folder'] ?? '';
    $newTitle = $_POST['title'] ?? '';
    $newCategory = $_POST['category'] ?? '';
    $newSubcategory = $_POST['subcategory'] ?? '';

    if (!$originalFolder || !is_dir(__DIR__ . '/' . $originalFolder)) jsonResponse(['error' => 'Product not found'], 404);

    $absFolder = __DIR__ . '/' . $originalFolder;
    
    // Determine New Path
    // If category/intro changed, we move the folder
    // Calculate new parent dir
    $targetCatDir = $IMAGES_DIR . '/' . $newCategory;
    if (!is_dir($targetCatDir)) mkdir($targetCatDir, 0777, true); // Should exist but safe check
    
    $targetParentDir = $targetCatDir;
    if ($newSubcategory && $newSubcategory !== 'General') {
        $targetParentDir .= '/' . $newSubcategory;
        if (!is_dir($targetParentDir)) mkdir($targetParentDir, 0777, true);
    }
    
    $safeNewTitle = preg_replace('/[^a-zA-Z0-9_\-\. ]/', '_', trim($newTitle));
    $newPath = $targetParentDir . '/' . $safeNewTitle;
    
    if ($absFolder !== $newPath) {
        if (is_dir($newPath)) jsonResponse(['error' => 'Product with this name already exists in target category'], 400);
        rename($absFolder, $newPath);
    } else {
        $newPath = $absFolder; // Just to be safe
    }

    // Save YouTube URL (Create or Overwrite)
    $youtubeUrl = $_POST['youtube_url'] ?? '';
    $ytFile = $newPath . '/youtube.txt';
    
    if ($youtubeUrl) {
        file_put_contents($ytFile, $youtubeUrl);
    } else {
        // If empty, delete existing file? Or just leave it?
        // User might clear the field to remove video.
        if (file_exists($ytFile) && isset($_POST['youtube_url'])) { // Only if field was sent
            unlink($ytFile);
        }
    }

    // Update Metadata Key if Title Changed
    if ($absFolder !== $newPath) {
        $meta = loadMetadata();
        $oldKey = slugify(basename($originalFolder));
        
        $newKey = slugify($safeNewTitle);
        // Handle collision
        if (isset($meta[$newKey])) {
             $newKey = $newKey . '-' . slugify($newCategory);
        }

        if (isset($meta[$oldKey])) {
            $meta[$newKey] = $meta[$oldKey]; // Copy data
            unset($meta[$oldKey]); // Remove old
            saveMetadata($meta);
        }
    }

    regenerateDataJs($IMAGES_DIR, $DATA_JS_FILE);
    jsonResponse(['success' => true]);
}

if ($action === 'get_thumbnail_metadata') {
    jsonResponse(loadThumbnailMetadata());
}

if ($action === 'set_thumbnail' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $type = $input['type'] ?? '';
    $key = $input['key'] ?? '';
    $imagePath = $input['image_path'] ?? '';

    if (!$type || !$key || !$imagePath) jsonResponse(['error' => 'Missing fields'], 400);

    $meta = loadThumbnailMetadata();
    // Ensure structure
    if (!isset($meta['products'])) $meta['products'] = [];
    if (!isset($meta['categories'])) $meta['categories'] = [];
    if (!isset($meta['subcategories'])) $meta['subcategories'] = [];

    if ($type === 'product') {
        $meta['products'][$key] = $imagePath;
    } elseif ($type === 'category') {
        $meta['categories'][$key] = $imagePath;
    } elseif ($type === 'subcategory') {
        $meta['subcategories'][$key] = $imagePath;
    }

    saveThumbnailMetadata($meta);
    regenerateDataJs($IMAGES_DIR, $DATA_JS_FILE); // This triggers regenerateThumbnailsJs too
    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid action'], 400);
