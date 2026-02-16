const express = require("express"); 
const router = express.Router(); 
const { createAccessToken } = require("../../controllers/daraz/daraz_controller"); 

router.get("/token", createAccessToken); 


module.exports = router;