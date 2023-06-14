"use strict";
const mongoose = require("mongoose");

// define model schema
const Promotion = mongoose.Schema(
  {
    name: { type: String },
    GiamGia: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
    productId: { type: Array },
    desc: {type: String}
  },
  { version: false, timestamps: true }
);

// define ID of object
Product.statics.objectId = function (id) {
  return mongoose.Types.objectId(id);
};

// export models
module.exports = {
  Promotion: mongoose.model("promotion", Promotion),
};