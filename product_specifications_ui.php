<?php
// product_specifications_ui.php
// This is an example integration into a product Add/Edit form

// Include the API to get active specifications and DB connection
// require_once 'specifications_api.php';

// In a real scenario, you'd fetch this from the database for the specific product being edited.
$productId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

// Fetch all globally 'active' specifications
$activeSpecs = []; // This should be: getActiveSpecifications($pdo);

// Dummy data for demonstration purposes if DB is not connected
if (empty($activeSpecs)) {
    $activeSpecs = [
        ['id' => 1, 'name' => 'Dimensions (L x W x H)'],
        ['id' => 2, 'name' => 'Machine Weight'],
        ['id' => 3, 'name' => 'Max User Weight'],
        ['id' => 4, 'name' => 'Frame Material']
    ];
}

// Fetch existing values for THIS product if editing
$existingValues = [];
if ($productId > 0) {
    // try {
    //     $stmt = $pdo->prepare("SELECT specification_id, specification_value FROM product_specification_values WHERE product_id = :id");
    //     $stmt->execute(['id' => $productId]);
    //     $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    //     foreach ($results as $row) {
    //         $existingValues[$row['specification_id']] = $row['specification_value'];
    //     }
    // } catch (Exception $e) {}
    
    // Example existing data
    $existingValues = [
        1 => '200cm x 100cm x 150cm',
        4 => '11-Gauge Commercial Steel'
    ];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Edit Product Specifications</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #fdfdfd; padding: 2rem; color: #333; }
        .form-container { max-width: 600px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #4a5568; }
        input[type="text"] { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e0; border-radius: 4px; box-sizing: border-box; }
        input[type="text"]:focus { outline: none; border-color: #4299e1; box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.2); }
        h2 { margin-top: 0; color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 10px; }
        .btn { background: #4299e1; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .btn:hover { background: #3182ce; }
    </style>
</head>
<body>

<div class="form-container">
    <h2><?php echo $productId > 0 ? "Edit Product" : "Add Product"; ?></h2>
    
    <!-- Action points to the API handler we created -->
    <form action="specifications_api.php" method="POST">
        <input type="hidden" name="action" value="save_product">
        <input type="hidden" name="product_id" value="<?php echo htmlspecialchars($productId); ?>">
        
        <div class="form-group">
            <label for="product_name">Product Name</label>
            <input type="text" id="product_name" name="product_name" value="<?php echo $productId > 0 ? 'Example Leg Press' : ''; ?>" required>
        </div>

        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 2rem 0;">
        <h3>Product Specifications</h3>
        <p style="font-size: 0.875rem; color: #718096; margin-bottom: 1.5rem;">
            Fill in the values for the specifications below. Leave blank if not applicable.
        </p>

        <?php if (!empty($activeSpecs)): ?>
            <?php foreach ($activeSpecs as $spec): ?>
                <?php 
                    $specId = $spec['id'];
                    $specName = htmlspecialchars($spec['name']);
                    
                    // Check if we have an existing value for this specific field
                    $currentValue = isset($existingValues[$specId]) ? htmlspecialchars($existingValues[$specId]) : '';
                ?>
                <div class="form-group">
                    <!-- The label is dynamically generated from the global specifications table -->
                    <label for="spec_<?php echo $specId; ?>"><?php echo $specName; ?></label>
                    
                    <!-- We use an array naming convention: product_specs[specification_id] -->
                    <!-- This allows PHP to easily loop over `$_POST['product_specs']` as an associative array -->
                    <input type="text" 
                           id="spec_<?php echo $specId; ?>" 
                           name="product_specs[<?php echo $specId; ?>]" 
                           value="<?php echo $currentValue; ?>" 
                           placeholder="Enter value for <?php echo $specName; ?>">
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <p>No active specifications found. Add some in the global settings first.</p>
        <?php endif; ?>

        <div style="margin-top: 2rem;">
            <button type="submit" class="btn">Save Product</button>
        </div>
    </form>
</div>

<script>
// Optionally, you could handle form submission via AJAX here.
const form = document.querySelector('form');
form.addEventListener('submit', function(e) {
    // e.preventDefault();
    // fetch('specifications_api.php', { method: 'POST', body: new FormData(this) })
    //   .then(response => response.json())
    //   .then(data => alert(data.message || data.error));
});
</script>

</body>
</html>
