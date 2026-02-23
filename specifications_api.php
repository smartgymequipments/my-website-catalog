<?php
// specifications_api.php
// Handles Global Specifications Management via local specifications.json file

header('Content-Type: application/json');

$specs_file = __DIR__ . '/specifications.json';

function load_specs_data($file) {
    if (!file_exists($file)) {
        return ["global_specs" => [], "product_specs" => [], "next_id" => 1];
    }
    $content = file_get_contents($file);
    if (!$content) {
        return ["global_specs" => [], "product_specs" => [], "next_id" => 1];
    }
    return json_decode($content, true) ?: ["global_specs" => [], "product_specs" => [], "next_id" => 1];
}

function save_specs_data($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($input) {
        $action = $input['action'] ?? $action;
    } else {
        $action = $_POST['action'] ?? $action;
        $input = $_POST;
    }
}

$specs_data = load_specs_data($specs_file);

// Helper function to sort correctly
function sort_specs(&$array) {
    usort($array, function($a, $b) {
        return strcasecmp($a['name'], $b['name']);
    });
}

// 1. GET ALL SPECIFICATIONS
if ($action === 'list_all' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $global_specs = $specs_data['global_specs'] ?? [];
    sort_specs($global_specs);
    echo json_encode(['success' => true, 'data' => $global_specs]);
    exit;
}

// 2. GET ACTIVE SPECIFICATIONS
if ($action === 'list_active' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $global_specs = $specs_data['global_specs'] ?? [];
    $active_specs = array_filter($global_specs, function($s) {
        return isset($s['is_active']) && $s['is_active'] == 1;
    });
    // array_filter preserves keys, re-index
    $active_specs = array_values($active_specs);
    sort_specs($active_specs);
    echo json_encode(['success' => true, 'data' => $active_specs]);
    exit;
}

// 3. GET PRODUCT SPECIFICATIONS
if ($action === 'get_product_specs' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $productKey = $_GET['product_key'] ?? '';
    if (!$productKey) {
        echo json_encode(['success' => false, 'error' => 'Product key required.']);
        exit;
    }
    
    $product_specs = $specs_data['product_specs'][$productKey] ?? [];
    echo json_encode(['success' => true, 'data' => $product_specs ?: new stdClass()]);
    exit;
}

// 4. ADD GLOBAL SPECIFICATION
if ($action === 'add_global_spec' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $specName = trim($input['spec_name'] ?? '');
    
    if (!empty($specName)) {
        if (!isset($specs_data['global_specs'])) $specs_data['global_specs'] = [];
        
        foreach ($specs_data['global_specs'] as $spec) {
            if (strcasecmp($spec['name'], $specName) === 0) {
                echo json_encode(['success' => false, 'error' => 'Specification already exists.']);
                exit;
            }
        }
        
        $new_id = $specs_data['next_id'] ?? 1;
        $specs_data['global_specs'][] = [
            "id" => $new_id,
            "name" => $specName,
            "is_active" => 1
        ];
        $specs_data['next_id'] = $new_id + 1;
        
        save_specs_data($specs_file, $specs_data);
        echo json_encode(['success' => true, 'message' => 'Specification added successfully.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Specification name is required.']);
    }
    exit;
}

// 5. TOGGLE GLOBAL SPECIFICATION
if ($action === 'toggle_global_spec' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $specId = (int)($input['spec_id'] ?? 0);
    $isActive = (int)($input['is_active'] ?? 0);
    
    if ($specId > 0) {
        $found = false;
        if (isset($specs_data['global_specs'])) {
            foreach ($specs_data['global_specs'] as &$spec) {
                if ($spec['id'] == $specId) {
                    $spec['is_active'] = $isActive;
                    $found = true;
                    break;
                }
            }
        }
        
        if ($found) {
            save_specs_data($specs_file, $specs_data);
            echo json_encode(['success' => true, 'message' => 'Specification status updated.']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Specification not found.']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid specification ID.']);
    }
    exit;
}

// 6. EDIT GLOBAL SPECIFICATION
if ($action === 'edit_global_spec' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $specId = (int)($input['spec_id'] ?? 0);
    $specName = trim($input['spec_name'] ?? '');
    
    if ($specId > 0 && !empty($specName)) {
        if (isset($specs_data['global_specs'])) {
            // Check for name collision
            foreach ($specs_data['global_specs'] as $spec) {
                if (strcasecmp($spec['name'], $specName) === 0 && $spec['id'] != $specId) {
                    echo json_encode(['success' => false, 'error' => 'Another specification with this name already exists.']);
                    exit;
                }
            }

            $found = false;
            foreach ($specs_data['global_specs'] as &$spec) {
                if ($spec['id'] == $specId) {
                    $spec['name'] = $specName;
                    $found = true;
                    break;
                }
            }
            if ($found) {
                save_specs_data($specs_file, $specs_data);
                echo json_encode(['success' => true, 'message' => 'Specification updated successfully.']);
                exit;
            }
        }
        echo json_encode(['success' => false, 'error' => 'Specification not found.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid specification ID or name.']);
    }
    exit;
}

// 7. DELETE GLOBAL SPECIFICATION
if ($action === 'delete_global_spec' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $specId = (int)($input['spec_id'] ?? 0);
    
    if ($specId > 0) {
        if (isset($specs_data['global_specs'])) {
            $original_len = count($specs_data['global_specs']);
            $specs_data['global_specs'] = array_filter($specs_data['global_specs'], function($s) use ($specId) {
                return $s['id'] != $specId;
            });
            
            // array_filter preserves keys, re-index
            $specs_data['global_specs'] = array_values($specs_data['global_specs']);
            
            if (count($specs_data['global_specs']) < $original_len) {
                // Remove this spec from all product specs
                if (isset($specs_data['product_specs'])) {
                    $specIdStr = (string)$specId;
                    foreach ($specs_data['product_specs'] as $pkey => &$specs) {
                        if (array_key_exists($specIdStr, $specs)) {
                            unset($specs[$specIdStr]);
                            if (empty($specs)) {
                                unset($specs_data['product_specs'][$pkey]);
                            }
                        }
                    }
                }

                save_specs_data($specs_file, $specs_data);
                echo json_encode(['success' => true, 'message' => 'Specification deleted successfully.']);
                exit;
            }
        }
        echo json_encode(['success' => false, 'error' => 'Specification not found.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid specification ID.']);
    }
    exit;
}

// 8. SAVE PRODUCT SPECIFICATIONS
if ($action === 'save_product_specs' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $productKey = $input['product_key'] ?? '';
    $specsArray = $input['specs'] ?? []; 
    
    if (empty($productKey)) {
        echo json_encode(['success' => false, 'error' => 'Product key is required.']);
        exit;
    }
    
    if (!isset($specs_data['product_specs'])) {
        $specs_data['product_specs'] = [];
    }
    
    $cleaned_specs = [];
    if (is_array($specsArray)) {
        foreach ($specsArray as $specId => $specValue) {
            $value = trim((string)$specValue);
            if ($value !== '') {
                $cleaned_specs[(string)$specId] = $value;
            }
        }
    }
    
    $specs_data['product_specs'][$productKey] = $cleaned_specs;
    
    // Clean up empty objects
    if (empty($cleaned_specs)) {
        unset($specs_data['product_specs'][$productKey]);
    }
    
    save_specs_data($specs_file, $specs_data);
    echo json_encode(['success' => true, 'message' => 'Product specifications saved.']);
    exit;
}

echo json_encode(['error' => 'Invalid action ' . htmlspecialchars($action)]);
exit;
