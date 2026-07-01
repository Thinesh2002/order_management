Order Management Fix - 2026-07-01

Fixed:
1. CORS: backend/index.js now always allows https://orders.teckvora.com and Teckvora subdomains.
2. 502 root cause protections: backend app.js removed; Express app and server are in backend/index.js only.
3. Daraz sync typo fixed: limt -> limit.
4. Sync page rebuilt: account-wise Daraz/Woo sync, days/date range/limit/max pages controls.
5. Sync confirmation added: fetched, saved, inserted, updated, items saved, confirmed order table count.
6. Sync logs added: daraz_order_sync_runs and woo_order_sync_runs.
7. Order logs fallback fixed: writes order logs into cm_order_management if cm_logs_management order_logs does not exist.
8. Duplicate order item protection added with unique keys.
9. Duplicate search bars fixed: page search bar removed; header search remains.

Deploy steps:
1. Upload backend and frontend.
2. Run SQL once:
   mysql -u root -p < database_upgrade_order_sync_fix_2026_07_01.sql
3. Backend:
   cd backend
   npm install --omit=dev
   pm2 restart orders-api || pm2 restart <your-backend-pm2-name>
4. Frontend:
   cd frontend
   npm install
   npm run build
   copy frontend/dist to the Nginx web root for orders.teckvora.com
5. Test:
   curl -i https://orders.api.teckvora.com/api/health
   curl -i -H "Origin: https://orders.teckvora.com" https://orders.api.teckvora.com/api/order-management/orders?limit=1

Important:
- The uploaded .env was not included in this fixed ZIP for safety.
- Use your PM2 environment variables or create backend/.env from backend/.env.example on the server.
