-- Create the MySQL tables for dynamic product specifications

-- 1. Specifications table (Global Management)
-- Stores the available specification fields (e.g., 'Weight', 'Dimensions', 'Material')
CREATE TABLE IF NOT EXISTS specifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE, -- e.g., 'Color', 'Max User Weight'
    is_active TINYINT(1) DEFAULT 1,    -- 1 = active (show on forms), 0 = inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Product Specification Values table (Data Handling)
-- Stores the actual text typed for a specific product and specification combination
-- Note: product_key references the string key/folder name used in data.js
CREATE TABLE IF NOT EXISTS product_specification_values (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_key VARCHAR(255) NOT NULL,
    specification_id INT NOT NULL,
    specification_value TEXT NOT NULL,
    
    FOREIGN KEY (specification_id) REFERENCES specifications(id) ON DELETE CASCADE,
    
    -- Ensure each product has only one value per specification field
    UNIQUE KEY unique_product_spec (product_key, specification_id)
);

-- Example Seed Data for specifications
INSERT IGNORE INTO specifications (name, is_active) VALUES 
('Dimensions (L x W x H)', 1),
('Machine Weight', 1),
('Max User Weight', 1),
('Frame Material', 1),
('Upholstery', 1);

-- 3. Admin Users table (Authentication)
-- Stores the credentials for the admin dashboard
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Seed Data: default admin using werkzeug format 
-- (scrypt:32768:8:1$vTfD34Pq$...) corresponding to 'password123' 
-- This will be managed by the Python backend.
INSERT IGNORE INTO admin_users (username, password_hash) VALUES 
('admin', 'scrypt:32768:8:1$CihS227y8623U88F$b86c34a2e519227572d4b967ffb4a558d1ec9c7f9996df0ba5dbfc9d9d28ea8fe44d2d410ae26e102fedc68cfcdcaedebe85d2639209581f1d11ff4ef39d8856');
