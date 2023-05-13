const express = require("express");
const adminController = require('../controllers/adminController');
const router = express.Router({});

router.get('/', adminController.home);
router.get('/user-list')

module.exports = router;