-- Run once to create the store_product_prices table (Task 3.8)
CREATE TABLE IF NOT EXISTS store_product_prices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  product_id INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  UNIQUE KEY uq_store_product_price (store_id, product_id),
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
