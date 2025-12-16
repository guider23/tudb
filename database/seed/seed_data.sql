-- Insert sample customers (mix of states including Tamil Nadu for testing)
INSERT INTO customers (name, email, phone, state, city) VALUES
('Raj Kumar', 'raj.kumar@example.com', '+91-9876543210', 'Tamil Nadu', 'Chennai'),
('Priya Sharma', 'priya.sharma@example.com', '+91-9876543211', 'Tamil Nadu', 'Coimbatore'),
('Amit Patel', 'amit.patel@example.com', '+91-9876543212', 'Gujarat', 'Ahmedabad'),
('Sneha Reddy', 'sneha.reddy@example.com', '+91-9876543213', 'Telangana', 'Hyderabad'),
('Vikram Singh', 'vikram.singh@example.com', '+91-9876543214', 'Maharashtra', 'Mumbai'),
('Lakshmi Iyer', 'lakshmi.iyer@example.com', '+91-9876543215', 'Tamil Nadu', 'Madurai'),
('Arjun Mehta', 'arjun.mehta@example.com', '+91-9876543216', 'Karnataka', 'Bangalore'),
('Divya Nair', 'divya.nair@example.com', '+91-9876543217', 'Kerala', 'Kochi'),
('Rahul Verma', 'rahul.verma@example.com', '+91-9876543218', 'Delhi', 'New Delhi'),
('Anjali Gupta', 'anjali.gupta@example.com', '+91-9876543219', 'Tamil Nadu', 'Salem'),
('Karthik Menon', 'karthik.menon@example.com', '+91-9876543220', 'Tamil Nadu', 'Trichy'),
('Meera Krishnan', 'meera.krishnan@example.com', '+91-9876543221', 'Tamil Nadu', 'Tirunelveli'),
('Suresh Babu', 'suresh.babu@example.com', '+91-9876543222', 'Andhra Pradesh', 'Vijayawada'),
('Pooja Joshi', 'pooja.joshi@example.com', '+91-9876543223', 'Rajasthan', 'Jaipur'),
('Deepak Kumar', 'deepak.kumar@example.com', '+91-9876543224', 'Bihar', 'Patna');

-- Insert sample products
INSERT INTO products (name, description, price, category, stock_quantity) VALUES
('Laptop Pro 15', 'High-performance laptop with 16GB RAM and 512GB SSD', 85000.00, 'Electronics', 50),
('Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 1200.00, 'Electronics', 200),
('Office Chair', 'Comfortable ergonomic office chair with lumbar support', 12500.00, 'Furniture', 75),
('Desk Lamp LED', 'Adjustable LED desk lamp with multiple brightness levels', 2500.00, 'Furniture', 150),
('Notebook Set', 'Set of 5 premium quality notebooks', 450.00, 'Stationery', 500),
('Mechanical Keyboard', 'RGB backlit mechanical keyboard', 5500.00, 'Electronics', 100),
('USB-C Hub', '7-in-1 USB-C hub with multiple ports', 3200.00, 'Electronics', 180),
('Standing Desk', 'Height-adjustable standing desk', 28000.00, 'Furniture', 30),
('Webcam HD', '1080p HD webcam with built-in microphone', 4500.00, 'Electronics', 120),
('Pen Set Premium', 'Premium pen set with leather case', 2800.00, 'Stationery', 250),
('Monitor 27inch', '27-inch 4K monitor with HDR support', 32000.00, 'Electronics', 60),
('Bookshelf', '5-tier wooden bookshelf', 8500.00, 'Furniture', 45),
('Headphones Wireless', 'Noise-cancelling wireless headphones', 7500.00, 'Electronics', 90),
('Desk Organizer', 'Multi-compartment desk organizer', 1800.00, 'Stationery', 300),
('Tablet 10inch', '10-inch tablet with 128GB storage', 28000.00, 'Electronics', 80);

-- Insert sample orders with various dates (last 60 days)
-- Recent orders (last 7 days)
INSERT INTO orders (customer_id, product_id, quantity, amount, status, ordered_at) VALUES
(1, 1, 1, 85000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(2, 6, 2, 11000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '3 days'),
(6, 11, 1, 32000.00, 'shipped', CURRENT_TIMESTAMP - INTERVAL '4 days'),
(10, 3, 1, 12500.00, 'processing', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(11, 9, 1, 4500.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '6 days');

-- Last 30 days
INSERT INTO orders (customer_id, product_id, quantity, amount, status, ordered_at) VALUES
(1, 2, 3, 3600.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '10 days'),
(2, 13, 1, 7500.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '12 days'),
(3, 8, 1, 28000.00, 'shipped', CURRENT_TIMESTAMP - INTERVAL '15 days'),
(6, 4, 2, 5000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '18 days'),
(10, 5, 5, 2250.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '20 days'),
(11, 15, 1, 28000.00, 'processing', CURRENT_TIMESTAMP - INTERVAL '22 days'),
(12, 7, 2, 6400.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '25 days'),
(4, 1, 1, 85000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '28 days');

-- Last month (30-60 days ago)
INSERT INTO orders (customer_id, product_id, quantity, amount, status, ordered_at) VALUES
(5, 11, 1, 32000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '35 days'),
(7, 6, 1, 5500.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '38 days'),
(8, 13, 1, 7500.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '40 days'),
(9, 3, 2, 25000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '42 days'),
(1, 14, 3, 5400.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '45 days'),
(2, 10, 2, 5600.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '48 days'),
(3, 12, 1, 8500.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '50 days'),
(6, 1, 1, 85000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '52 days'),
(10, 9, 2, 9000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '55 days'),
(11, 7, 1, 3200.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '58 days');

-- High-value orders from Tamil Nadu customers (for testing specific query)
INSERT INTO orders (customer_id, product_id, quantity, amount, status, ordered_at) VALUES
(1, 8, 1, 28000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '8 days'),
(2, 1, 1, 85000.00, 'processing', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(6, 15, 2, 56000.00, 'shipped', CURRENT_TIMESTAMP - INTERVAL '15 days'),
(10, 11, 1, 32000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '20 days'),
(11, 8, 1, 28000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '12 days'),
(12, 1, 1, 85000.00, 'processing', CURRENT_TIMESTAMP - INTERVAL '7 days');

-- Additional orders for revenue analysis
INSERT INTO orders (customer_id, product_id, quantity, amount, status, ordered_at) VALUES
(13, 2, 5, 6000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '16 days'),
(14, 4, 3, 7500.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '19 days'),
(15, 5, 10, 4500.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '23 days'),
(4, 6, 1, 5500.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '11 days'),
(5, 13, 2, 15000.00, 'delivered', CURRENT_TIMESTAMP - INTERVAL '14 days');

-- Update shipped and delivered timestamps for completed orders
UPDATE orders 
SET shipped_at = ordered_at + INTERVAL '1 day',
    delivered_at = ordered_at + INTERVAL '4 days'
WHERE status = 'delivered';

UPDATE orders 
SET shipped_at = ordered_at + INTERVAL '1 day'
WHERE status = 'shipped';
