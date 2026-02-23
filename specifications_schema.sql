-- Create the MySQL tables for dynamic product specifications

-- 1. Products table
-- Assuming an existing products table structure, or creating a basic one if needed.
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) DEFAULT '',
    subcategory VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Specifications table (Global Management)
-- Stores the available specification fields (e.g., 'Weight', 'Dimensions', 'Material')
CREATE TABLE IF NOT EXISTS specifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE, -- e.g., 'Color', 'Max User Weight'
    is_active TINYINT(1) DEFAULT 1,    -- 1 = active (show on forms), 0 = inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Product Specification Values table (Data Handling)
-- Stores the actual text typed for a specific product and specification combination
CREATE TABLE IF NOT EXISTS product_specification_values (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    specification_id INT NOT NULL,
    specification_value TEXT NOT NULL,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (specification_id) REFERENCES specifications(id) ON DELETE CASCADE,
    
    -- Ensure each product has only one value per specification field
    UNIQUE KEY unique_product_spec (product_id, specification_id)
);

-- Example Seed Data for specifications
INSERT IGNORE INTO specifications (name, is_active) VALUES 
('Dimensions (L x W x H)', 1),
('Machine Weight', 1),
('Max User Weight', 1),
('Frame Material', 1),
('Upholstery', 1);
