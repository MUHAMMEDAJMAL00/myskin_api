-- Run once to create the refresh_tokens table for token rotation (Task 3.7)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME DEFAULT NOW(),
  INDEX idx_rt_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
