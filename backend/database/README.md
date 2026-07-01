# Database files

Run these only when you need a clean database or missing tables:

1. `cm_order_management_required_tables.sql`
2. `cm_marketplace_required_tables.sql`

The backend still supports your existing marketplace/product/inventory databases through `.env` names:

- `ORDER_DB_NAME=cm_order_management`
- `MP_DB_NAME=cm_marketplace_management`
- `PM_DB_NAME=cm_product_management`
- `INVENTORY_DB_NAME=cm_inventory_management`
