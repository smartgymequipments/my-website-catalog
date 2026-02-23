<?php
// specifications_api.php
// Handles Database Connections and Global Specifications Management

$db_host = 'localhost';
$db_user = 'root'; // Change your database username
$db_pass = '';     // Change your database password
$db_name = 'gym_catalog'; // Change your database name

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Function to fetch all active global specifications
function getActiveSpecifications($pdo) {
    $stmt = $pdo->query("SELECT * FROM specifications WHERE is_active = 1 ORDER BY id ASC");
    return $stmt->fetchAll();
}

// Function to fetch all global specifications (for the admin management UI)
function getAllSpecifications($pdo) {
    $stmt = $pdo->query("SELECT * BY name ASC");
    return $stmt->fetchAll();
}

// --- GLOBAL MANAGEMENT: Add new specification field ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_global_spec') {
    $specName = trim($_POST['spec_name'] ?? '');
    
    if (!empty($specName)) {
        try {
            $stmt = $pdo->prepare("INSERT INTO specifications (name, is_active) VALUES (:name, 1)");
            $stmt->execute(['name' => $specName]);
            echo json_encode(['success' => true, 'message' => 'Specification added successfully.']);
        } catch (PDOException $e) {
            // Handle duplicate entries explicitly
            if ($e->getCode() == 23000) {
                echo json_encode(['success' => false, 'error' => 'Specification already exists.']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
            }
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Specification name is required.']);
    }
    exit;
}

// --- GLOBAL MANAGEMENT: Toggle specification active status ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'toggle_global_spec') {
    $specId = (int)($_POST['spec_id'] ?? 0);
    $isActive = (int)($_POST['is_active'] ?? 0);
    
    if ($specId > 0) {
        $stmt = $pdo->prepare("UPDATE specifications SET is_active = :is_active WHERE id = :id");
        $stmt->execute(['is_active' => $isActive, 'id' => $specId]);
        echo json_encode(['success' => true, 'message' => 'Specification status updated.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid specification ID.']);
    }
    exit;
}

// --- DATA HANDLING: Save product specifications ---
function saveProductSpecifications($pdo, $productId, $specsArray) {
    // specsArray should be an associative array where key is `specification_id` and value is the typed text.
    // E.g., ['1' => '150kg', '2' => 'Steel']
    
    if (empty($productId) || !is_array($specsArray)) {
        return false;
    }

    try {
        $pdo->beginTransaction();

        // 1. Remove old specifications for this product to avoid unique constraint duplicates,
        // or we use ON DUPLICATE KEY UPDATE / INSERT IGNORE. Removing and re-inserting is often cleaner.
        $stmtDelete = $pdo->prepare("DELETE FROM product_specification_values WHERE product_id = :product_id");
        $stmtDelete->execute(['product_id' => $productId]);

        // 2. Insert new typed values
        $stmtInsert = $pdo->prepare("
            INSERT INTO product_specification_values (product_id, specification_id, specification_value) 
            VALUES (:product_id, :specification_id, :specification_value)
        ");

        foreach ($specsArray as $specId => $specValue) {
            $value = trim($specValue);
            // Only save if the user actually typed something
            if (!empty($value)) {
                $stmtInsert->execute([
                    'product_id' => $productId,
                    'specification_id' => (int)$specId,
                    'specification_value' => $value
                ]);
            }
        }

        $pdo->commit();
        return true;
    } catch (PDOException $e) {
        $pdo->rollBack();
        // Log error: $e->getMessage();
        return false;
    }
}

// Example usage to handle form submission for a product:
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'save_product') {
    $productId = (int)($_POST['product_id'] ?? 0);
    
    // An array of specification inputs named: product_specs[1], product_specs[2], etc.
    $productSpecs = $_POST['product_specs'] ?? [];
    
    // Imagine logic to create/update base product details happens here...
    // e.g., UPDATE products SET name = :name WHERE id = :id
    
    if ($productId > 0) {
        // Save the dynamic specifications
        $saved = saveProductSpecifications($pdo, $productId, $productSpecs);
        
        if ($saved) {
             echo json_encode(['success' => true, 'message' => 'Product and specifications saved successfully.']);
        } else {
             echo json_encode(['success' => false, 'error' => 'Failed to save product specifications.']);
        }
    }
    exit;
}
?>
