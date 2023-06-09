"use strict";
const moment = require("moment");

const Product = require("../models/product").Product;
const User = require("../models/user").User;
const OrderDetail = require("../models/orderDetail").OrderDetail;
const Comment = require("../models/comment").Comment;
const Category = require("../models/category").category;

function HomeController() {
  // chua global var
  const SELF = {
    SIZE: 8,
    calRate: (listCmt, count) => {
      let rate = 0;
      let totalStar = 0;
      for (let i = 0; i < listCmt.length; i++) {
        totalStar = totalStar + listCmt[i].rate;
      }
      if (totalStar % count !== 0) {
        // nếu tổng số star cmt chia count có dư
        rate = Math.floor(totalStar / count) + 1; // làm tròn số xuống cận dưới rồi + 1
      } else {
        rate = totalStar / count; // nếu ko dư thì chia bth
      }
      return rate;
    },
    formatDateToString: (date) => {
      return moment(date).format("DD/MM/YYYY, h:mm:ss a");
    },
    getAllCategories: () => {
      return Category.find()
        .then()
        .catch((error) => {
          console.error(error);
        });
    },
  };
  let detailProductGB = {};
  let listSuggestGB = [];
  let listCommentsGB = [];
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

        let result = await Product.findById(productId);
        let listSuggestItem = await Product.find().limit(4); // get 4 suggestions
        let listComment = await Comment.find({ productID: productId }); // get all comments
        if (!result) {
          return res.json({ s: 404, msg: "Product not found" });
        }
        if (!listSuggestItem) {
          return res.json({ s: 404, msg: "Get list suggest fail" });
        }

        detailProductGB = result;
        listSuggestGB = listSuggestItem;
        listCommentsGB = listComment;

        return res.render("pages/detail", {
          data: result,
          listItems: listSuggestItem,
          comments: listComment,
        });
      } catch (error) {
        console.error("get detail at homeControlelr error: " + err);
      }
    },
    getList: async (req, res) => {
      try {
        // let {page, searchValue, category, star} = req.query
        let page = req.query.page;
        let keySearch = req.query.searchValue || "";
        let categorySearch = req.query.category || "";
        let priceRange = req.query.priceRange || "";
        let rateStar = req.query.star || "";
        //paging
        if (!page || parseInt(page) <= 0) {
          page = 1;
        }
        let skip = (parseInt(page) - 1) * SELF.SIZE;
        //filter
        let filter = {};
        // filter by name
        if (keySearch) {
          filter["name"] = new RegExp(keySearch, "i");
        }
        // filter by category
        if (categorySearch) {
          filter["categoryId"] = categorySearch;
        }
        // filter by rate
        if (rateStar) {
          filter["rate"] = parseInt(rateStar);
        }
        // filter by price
        if (priceRange) {
          let maxPrice = priceRange.split("-")[1];
          let minPrice = priceRange.split("-")[0];
          filter["price"] = {$gte: parseInt(minPrice), $lte: parseInt(maxPrice)}
        }
        //get all categories
        let categoryList = await SELF.getAllCategories();
        // pagination
        Promise.all([
          // 2 hàm bên trong sẽ thực thi đồng thời ==> giảm thời gian thực thi ==> improve performance
          Product.countDocuments(filter).lean(), // Lấy tổng số product
          Product.find(filter)
            .skip(skip) // số trang bỏ qua ==> skip = (số trang hiện tại - 1) * số item ở mỗi trang
            .limit(SELF.SIZE)
            .lean(), // số item ở mỗi trang
        ])
          .then(async (rs) => {
            // rs trả ra 1 array [kết quả của function 1, kết quả của function 2, ..]
            let productCount = rs[0]; // tổng số product
            let pageCount = 0; // tổng số trang
            if (productCount % SELF.SIZE !== 0) {
              // nếu tổng số product chia SIZE có dư
              pageCount = Math.floor(productCount / SELF.SIZE) + 1; // làm tròn số xuống cận dưới rồi + 1
            } else {
              pageCount = productCount / SELF.SIZE; // nếu ko dư thì chia bth
            }
            res.render("pages/products.ejs", {
              listItems: rs[1],
              pages: pageCount, // tổng số trang
              listCategories: categoryList,
              searchText: keySearch || "",
              filters: {
                category: categorySearch,
                star: rateStar,
                prices: priceRange,
              },
            });
          })
          .catch((error) => {
            res.send({ s: 400, msg: error });
          });
      } catch (error) {
        console.log(error);
      }
    },
    createComment: async (req, res) => {
      try {
        let commentData = req.body;

        let uid = res.locals.user; // get current user id;
        let currentUser = await User.findById(uid);

        commentData.userID = uid;
        commentData.username = currentUser.username;
        commentData.createDate = SELF.formatDateToString(new Date());

        // Check if user already buy this item
        const checkBuyAlready = await OrderDetail.findOne({
          $and: [{ productID: commentData?.productID }, { userID: uid }],
        }).lean();

        if (checkBuyAlready) {
          Comment.create(commentData)
            .then(async (rs) => {
              if (rs) {
                let commentCount = await Comment.find({
                  productID: commentData?.productID,
                });
                let rateUpdate = SELF.calRate(
                  commentCount,
                  commentCount.length
                );
                await Product.findByIdAndUpdate(commentData?.productID, {
                  rate: rateUpdate,
                });
                return res.redirect(
                  `/products/detail/${commentData?.productID}`
                );
              }
            })
            .catch((err) => {
              console.log(err);
            });
        } else {
          return res.render("pages/detail", {
            data: detailProductGB,
            listItems: listSuggestGB,
            comments: listCommentsGB,
            msg: "Bạn không thể đánh giá sản phẩm khi chưa mua !!",
          });
        }
      } catch (error) {
        console.log("error at create comment", error);
      }
    },
  };
}

module.exports = new HomeController();
