<?php
// specifications_api.php
// Handles Database Connections and Global Specifications Management

$db_host = 'localhost';
$db_user = 'root'; // Change your database username
$db_pass = '';     // Change your database password
$db_name = 'gym_catalog'; // Change your database name

// Send JSON headers for all responses
header('Content-Type: application/json');

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database connection failed. Please ensure the specifications_schema.sql has been imported.']);
    exit;
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

// 1. GET ALL SPECIFICATIONS (For Manage Modal)
if ($action === 'list_all' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM specifications ORDER BY name ASC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// 2. GET ACTIVE SPECIFICATIONS (For Add/Edit Product Modal)
if ($action === 'list_active' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("SELECT * FROM specifications WHERE is_active = 1 ORDER BY name ASC");
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    exit;
}

// 3. GET PRODUCT SPECIFICATIONS
if ($action === 'get_product_specs' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $productKey = $_GET['product_key'] ?? '';
    if (!$productKey) {
        echo json_encode(['success' => false, 'error' => 'Product key required.']);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT specification_id, specification_value FROM product_specification_values WHERE product_key = :key");
    $stmt->execute(['key' => $productKey]);
    $results = $stmt->fetchAll();
    
    // Map to simple key-value pair: { "spec_id": "value" }
    $mapped = [];
    foreach ($results as $row) {
        $mapped[$row['specification_id']] = $row['specification_value'];
    }
    
    echo json_encode(['success' => true, 'data' => $mapped]);
    exit;
}

// 4. ADD GLOBAL SPECIFICATION
if ($action === 'add_global_spec' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $specName = trim($input['spec_name'] ?? '');
    
    if (!empty($specName)) {
        try {
            $stmt = $pdo->prepare("INSERT INTO specifications (name, is_active) VALUES (:name, 1)");
            $stmt->execute(['name' => $specName]);
            echo json_encode(['success' => true, 'message' => 'Specification added successfully.']);
        } catch (PDOException $e) {
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

// 5. TOGGLE GLOBAL SPECIFICATION
if ($action === 'toggle_global_spec' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $specId = (int)($input['spec_id'] ?? 0);
    $isActive = (int)($input['is_active'] ?? 0);
    
    if ($specId > 0) {
        $stmt = $pdo->prepare("UPDATE specifications SET is_active = :is_active WHERE id = :id");
        $stmt->execute(['is_active' => $isActive, 'id' => $specId]);
        echo json_encode(['success' => true, 'message' => 'Specification status updated.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid specification ID.']);
    }
    exit;
}

// 6. SAVE PRODUCT SPECIFICATIONS
if ($action === 'save_product_specs' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    // Determine input format (JSON or FormData)
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }
    
    $productKey = $input['product_key'] ?? '';
    // Expected format: {"1": "Value for spec 1", "2": "Value for spec 2"}
    $specsArray = $input['specs'] ?? []; 
    
    if (empty($productKey)) {
        echo json_encode(['success' => false, 'error' => 'Product key is required.']);
        exit;
    }
    
    try {
        $pdo->beginTransaction();

        $stmtDelete = $pdo->prepare("DELETE FROM product_specification_values WHERE product_key = :key");
        $stmtDelete->execute(['key' => $productKey]);

        if (!empty($specsArray) && is_array($specsArray)) {
            $stmtInsert = $pdo->prepare("
                INSERT INTO product_specification_values (product_key, specification_id, specification_value) 
                VALUES (:product_key, :specification_id, :specification_value)
            ");

            foreach ($specsArray as $specId => $specValue) {
                $value = trim($specValue);
                if (!empty($value)) {
                    $stmtInsert->execute([
                        'product_key' => $productKey,
                        'specification_id' => (int)$specId,
                        'specification_value' => $value
                    ]);
                }
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Product specifications saved.']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => 'Failed to save product specifications: ' . $e->getMessage()]);
    }
    exit;
}

echo json_encode(['error' => 'Invalid action']);
exit;
