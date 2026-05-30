# Database Migration Instructions

## To add the `type` and `qr_code` columns to the reagents_chemicals table:

### Option 1: Using phpMyAdmin or MySQL Workbench
1. Open your MySQL database client
2. Select the `biocella` database
3. Run the SQL from the file: `biocella-api/migrations/add_type_and_qrcode_to_chemicals.sql`

### Option 2: Using MySQL Command Line
```bash
mysql -u root -p biocella < biocella-api/migrations/add_type_and_qrcode_to_chemicals.sql
```

### Option 3: Manual SQL (copy and paste into your SQL client)
```sql
ALTER TABLE `reagents_chemicals` 
ADD COLUMN `type` VARCHAR(100) NULL AFTER `name`,
ADD COLUMN `qr_code` TEXT NULL AFTER `threshold`;

UPDATE `reagents_chemicals` SET `type` = 'General' WHERE `type` IS NULL;
```

## After running the migration:
1. Both servers are already running
2. Navigate to: http://localhost:3001/AdminUI/AdminDashBoard/Features/AdminInventory
3. Try adding a new chemical - a QR code will be automatically generated!
4. Use the Type filter to categorize chemicals (Agar, Protein, Acid, etc.)
