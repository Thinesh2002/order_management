# Central Management - Backend Structure

This backend is organized using a clean MVC/service structure so each part has a clear job.

```txt
backend/
├── app.js                         # Express app, middleware, routes, 404/error handlers
├── index.js                       # Server start + jobs start + graceful shutdown
├── config/
│   ├── db.js                      # MySQL pool config for order/product/inventory/marketplace/auth/log DBs
│   └── env.js                     # Safe env helper functions
├── constants/
│   └── orderConstants.js          # Shared status/source/platform constants
├── controllers/
│   └── orderManagementController.js
├── database/
│   ├── cm_order_management_required_tables.sql
│   ├── cm_marketplace_required_tables.sql
│   └── README.md
├── jobs/
│   ├── marketplaceOrderSyncJob.js # Daraz/Woo auto order sync job
│   └── transExpressTrackingJob.js # Trans Express tracking refresh job
├── middlewares/
│   ├── errorHandler.js            # Central API error response
│   ├── notFoundHandler.js         # 404 response
│   └── validateRequest.js         # Request validation wrapper
├── models/
│   ├── baseModel.js               # Generic DB helper model
│   ├── customerModel.js
│   ├── orderModel.js
│   ├── orderItemModel.js
│   ├── darazOrderModel.js
│   ├── wooOrderModel.js
│   ├── packingMaterialModel.js
│   ├── transExpressModel.js
│   ├── syncSettingModel.js
│   ├── logModel.js
│   ├── marketplaceAccountModel.js
│   ├── skuMappingModel.js
│   ├── productModel.js
│   ├── inventoryModel.js
│   └── index.js
├── routes/
│   └── orderManagementRoutes.js
├── scripts/
│   └── check-syntax.js            # Checks all JS files with node --check
├── services/
│   ├── customerService.js
│   ├── darazClientService.js
│   ├── darazOrderActionService.js
│   ├── darazOrderDetailService.js
│   ├── inventoryStockService.js
│   ├── logService.js
│   ├── marketplaceAccountService.js
│   ├── marketplaceOrderSyncService.js
│   ├── orderService.js
│   ├── packingMaterialService.js
│   ├── productLookupService.js
│   ├── skuMappingService.js
│   ├── syncSettingService.js
│   └── transExpressService.js
├── utils/
│   ├── asyncHandler.js
│   └── dbUtils.js
└── validators/
    └── orderValidator.js
```

## Layer rules

### Routes
Only define API endpoints and connect them to controllers.

### Controllers
Only handle `req` and `res`. Business logic should not stay here.

### Services
Business logic lives here: order creation, Daraz sync, Woo sync, stock deduction, waybill creation, tracking refresh.

### Models
Only database read/write queries should live here. New modules should add database code here first, then call it from services.

### Jobs
Background repeated work lives here, such as marketplace order sync and courier tracking checks.

### Config
Database pools and environment helpers live here.

## Run

```bash
npm install
cp .env.example .env
npm run check
npm start
```

Health check:

```txt
GET /api/health
```

Main API base:

```txt
/api/order-management
```
