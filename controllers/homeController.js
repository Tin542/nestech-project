"use strict";
const Product = require("../models/product").Product;

function HomeController() {
  // chua global var
  const SELF = {
    SIZE: 8,
  };
  return {
    home: (req, res) => {
      try {
        return Product.find({ rate: 5 }) // Product.find()
          .limit(SELF.SIZE)
          .then((rs) => {
            res.render("pages/home", { listItems: rs });
          })
          .catch((err) => {
            console.error("get list at homeControlelr error: " + err);
          });
      } catch (error) {
        console.log("error at home controller", error);
      }
    },
    getProductDetail: async (req, res) => {
      try {
        let productId = req.params?.id;
        console.log("Product id", productId);
        let result = await Product.findById(productId);
        if (!result) {
          return res.json({ s: 404, msg: "Product not found" });
        }
        return res.render("pages/detail", { data: result });
      } catch (error) {
        console.error("get detail at homeControlelr error: " + err);
      }
    },
  };
}

module.exports = new HomeController();
