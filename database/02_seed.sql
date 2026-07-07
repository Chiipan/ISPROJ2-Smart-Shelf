/* ================================================================
   TableTop (Smart Shelf) - Seed Data
   Run AFTER 01_schema.sql:
     sqlcmd -S "(localdb)\MSSQLLocalDB" -d tabletop -b -I -i 02_seed.sql

   IDs are fixed uuids so the script is re-runnable and FKs are stable.
   ================================================================ */

USE tabletop;
GO

/* ---------------- roles ---------------- */
INSERT INTO dbo.roles (role_id, role_name) VALUES
('a1000000-0000-4000-8000-000000000001', 'admin'),
('a1000000-0000-4000-8000-000000000002', 'waiter'),
('a1000000-0000-4000-8000-000000000003', 'kitchen'),
('a1000000-0000-4000-8000-000000000004', 'customer'); -- self-registered members

/* ---------------- users ----------------
   Password below is a bcrypt hash of "admin123" - replace in production. */
INSERT INTO dbo.users (user_id, first_name, last_name, email, password) VALUES
('b1000000-0000-4000-8000-000000000001', 'System', 'Admin', 'admin@smartshelf.local',
 '$2b$10$9ZFdl7OFVt35M2328GwuAOVkp1wBebrTT4ET2jegGC1mSAFE/sgSe');

/* Waiter dashboard login - bcrypt hash of "waiter123" */
INSERT INTO dbo.users (user_id, first_name, last_name, email, password) VALUES
('b1000000-0000-4000-8000-000000000002', 'Juan', 'Dela Cruz', 'waiter@smartshelf.local',
 '$2b$10$pXgiBOBT65S.W3eth19mKOd/PfIZCWgbrLSahwFbPOkdfFELN4X4q');

/* Kitchen dashboard login - bcrypt hash of "kitchen123" */
INSERT INTO dbo.users (user_id, first_name, last_name, email, password) VALUES
('b1000000-0000-4000-8000-000000000003', 'Pedro', 'Reyes', 'kitchen@smartshelf.local',
 '$2b$10$bE0jKL7nH6lycniFY6dFUelhiOZwxcUV0meKnrLtamsTPX4zGPS1K');

INSERT INTO dbo.roles_and_users (roles_and_users_id, user_id, role_id) VALUES
('c1000000-0000-4000-8000-000000000001',
 'b1000000-0000-4000-8000-000000000001',
 'a1000000-0000-4000-8000-000000000001'),
('c1000000-0000-4000-8000-000000000002',
 'b1000000-0000-4000-8000-000000000002',
 'a1000000-0000-4000-8000-000000000002'), -- waiter
('c1000000-0000-4000-8000-000000000003',
 'b1000000-0000-4000-8000-000000000003',
 'a1000000-0000-4000-8000-000000000003'); -- kitchen

/* ---------------- staff ----------------
   staff_code = PIN typed on a customer tablet (ID verification, cash confirm) */
INSERT INTO dbo.staff (staff_id, first_name, last_name, role_id, user_id, staff_code) VALUES
('d1000000-0000-4000-8000-000000000001', 'Juan',  'Dela Cruz', 'a1000000-0000-4000-8000-000000000002',
 'b1000000-0000-4000-8000-000000000002', '1111'),                                                              -- waiter (has login)
('d1000000-0000-4000-8000-000000000002', 'Maria', 'Santos',    'a1000000-0000-4000-8000-000000000002', NULL, '2222'), -- waiter
('d1000000-0000-4000-8000-000000000003', 'Pedro', 'Reyes',     'a1000000-0000-4000-8000-000000000003',
 'b1000000-0000-4000-8000-000000000003', '3333');                                                              -- kitchen (has login)

/* ---------------- tables (tablet logins) ---------------- */
INSERT INTO dbo.tables (table_id, table_name, password, table_type, capacity) VALUES
('e1000000-0000-4000-8000-000000000001', 'Table 1',  '1234', 1, 2),
('e1000000-0000-4000-8000-000000000002', 'Table 2',  '1234', 1, 4),
('e1000000-0000-4000-8000-000000000003', 'Table 3',  '1234', 1, 4),
('e1000000-0000-4000-8000-000000000004', 'Table 4',  '1234', 2, 8),
('e1000000-0000-4000-8000-000000000005', 'Table 5',  '1234', 1, 2),
('e1000000-0000-4000-8000-000000000006', 'Table 6',  '1234', 1, 4),
('e1000000-0000-4000-8000-000000000007', 'Table 7',  '1234', 1, 4),
('e1000000-0000-4000-8000-000000000008', 'Table 8',  '1234', 1, 6),
('e1000000-0000-4000-8000-000000000009', 'Table 9',  '1234', 1, 2),
('e1000000-0000-4000-8000-000000000010', 'Table 10', '1234', 2, 8),
('e1000000-0000-4000-8000-000000000011', 'Table 11', '1234', 1, 4),
('e1000000-0000-4000-8000-000000000012', 'Table 12', '1234', 1, 6),
('e1000000-0000-4000-8000-000000000013', 'Table 13', '1234', 1, 2),
('e1000000-0000-4000-8000-000000000014', 'Table 14', '1234', 1, 4),
('e1000000-0000-4000-8000-000000000015', 'Table 15', '1234', 2, 10);

/* ---------------- menu ---------------- */
INSERT INTO dbo.categories (category_id, category_name) VALUES
('f1000000-0000-4000-8000-000000000001', 'Appetizers'),
('f1000000-0000-4000-8000-000000000002', 'Mains'),
('f1000000-0000-4000-8000-000000000003', 'Desserts'),
('f1000000-0000-4000-8000-000000000004', 'Drinks');

INSERT INTO dbo.menu_item (menu_item_id, category_id, menu_title, food_item, unit_price, status) VALUES
('01000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002', 'Cheeseburger',
 'Quarter-pound beef patty, cheddar, house sauce', 189.00, 'available'),
('01000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002', 'Clubhouse Sandwich',
 'Triple-decker with chicken, bacon, egg', 165.00, 'available'),
('01000000-0000-4000-8000-000000000003', 'f1000000-0000-4000-8000-000000000001', 'Calamares',
 'Crispy squid rings with garlic aioli', 145.00, 'available'),
('01000000-0000-4000-8000-000000000004', 'f1000000-0000-4000-8000-000000000003', 'Leche Flan',
 'Classic caramel custard', 85.00, 'available'),
('01000000-0000-4000-8000-000000000005', 'f1000000-0000-4000-8000-000000000004', 'Iced Tea',
 'House-blend iced tea, bottomless', 65.00, 'available');

/* ---------------- inventory + recipes ---------------- */
INSERT INTO dbo.inventory (inventory_id, item_name, unit_of_measure, quantity_in_stock, reorder_level, unit_cost) VALUES
('11000000-0000-4000-8000-000000000001', 'Beef Patty',     'pc', 120, 20, 45.00),
('11000000-0000-4000-8000-000000000002', 'Burger Bun',     'pc', 120, 20, 12.00),
('11000000-0000-4000-8000-000000000003', 'Cheddar Slice',  'pc', 200, 30,  8.00),
('11000000-0000-4000-8000-000000000004', 'Sliced Bread',   'pc', 300, 50,  4.00),
('11000000-0000-4000-8000-000000000005', 'Chicken Breast', 'kg',  25,  5, 220.00),
('11000000-0000-4000-8000-000000000006', 'Squid',          'kg',  10,  3, 260.00);

INSERT INTO dbo.recipes_inventory (recipes_inventory_id, menu_item_id, inventory_id, amount_needed) VALUES
-- Cheeseburger = 1 patty + 1 bun + 1 cheese slice
('21000000-0000-4000-8000-000000000001', '01000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 1),
('21000000-0000-4000-8000-000000000002', '01000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000002', 1),
('21000000-0000-4000-8000-000000000003', '01000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', 1),
-- Clubhouse = 3 bread + 0.15 kg chicken
('21000000-0000-4000-8000-000000000004', '01000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000004', 3),
('21000000-0000-4000-8000-000000000005', '01000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000005', 0.15),
-- Calamares = 0.2 kg squid
('21000000-0000-4000-8000-000000000006', '01000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000006', 0.20);

/* ---------------- discounts (PH statutory) ---------------- */
INSERT INTO dbo.discounts (discount_id, discount_type, rate) VALUES
('31000000-0000-4000-8000-000000000001', 'Senior Citizen', 0.20),
('31000000-0000-4000-8000-000000000002', 'PWD',            0.20);

/* ---------------- sample order flow (Table 2) ----------------
   Demonstrates the Customer -> Kitchen -> Waiter -> Admin loop:
   cheeseburger ready to serve, sandwich still cooking, waiter called. */
INSERT INTO dbo.orders (orders_id, table_id, status) VALUES
('41000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002', 'in_progress');

INSERT INTO dbo.order_details (order_details_id, orders_id, menu_item_id, price, quantity, total, notes, status) VALUES
('51000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001',
 '01000000-0000-4000-8000-000000000001', 189.00, 1, 189.00, 'No onions', 'ready_to_serve'),
('51000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000001',
 '01000000-0000-4000-8000-000000000002', 165.00, 1, 165.00, NULL, 'in_progress');

INSERT INTO dbo.order_process (order_process_id, orders_id, stage, completed_at) VALUES
('61000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'placed', SYSDATETIME()),
('61000000-0000-4000-8000-000000000002', '41000000-0000-4000-8000-000000000001', 'in_progress', NULL);

INSERT INTO dbo.waiter_calls (waiter_call_id, table_id, request_type, message) VALUES
('71000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002',
 'assistance', 'Extra utensils please');
GO
