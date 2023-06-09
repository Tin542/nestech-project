const express = require("express");
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const categoryControler = require('../controllers/categoryControler');
const router = express.Router({});
const fileService = require("../services/fileService");
const multer = require("multer");


const upload = multer({
    storage: multer.memoryStorage(),
})

router.use(authController.checkLogin);
// product
router.get('/products/list', adminController.getList);
router.post('/products/add', adminController.addProduct);
router.get('/products/detail/:id', adminController.getProductDetail);
router.post('/products/edit', adminController.editProduct);
router.delete('/products/delete/:id', adminController.deleteProduct);

//promotion
router.get('/promotion/list', adminController.getPromotionList);
router.post('/promotion/add', adminController.addPromotion);
router.get('/promotion/detail/:id', adminController.getPromotionDetail);
router.post('/promotion/edit', adminController.editPromotion);
router.delete('/promotion/delete/:id', adminController.deletePromotion);


// user
router.get('/user/list', adminController.users);

// staff
router.get('/staffs/list', adminController.staffs);
router.post('/staffs/add', adminController.addStaff);
router.get("/staffs/export", adminController.exportStaff);
// Category
router.get('/category/list', categoryControler.getList);
router.post('/category/add', categoryControler.addcategory);
router.get('/category/detail/:id', categoryControler.getcategorydetail);
router.post('/category/edit', categoryControler.editcategory);
router.delete('/category/delete/:id', categoryControler.deletecategory);
// Excel import, export
// router.get("/file", (req, res) => {
//     res.render("pages/testList");
//   });
// router.post("/import-excel", fileService.uploadFileExcel);


// upload hinh anh
router.post("/products/upload-image", upload.single("file"), fileService.uploadFile);

module.exports = router;