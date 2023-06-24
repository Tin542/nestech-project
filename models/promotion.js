"use strict";
const mongoose = require("mongoose");

// define model schema
const Promotion = mongoose.Schema(
  {
    name: { type: String },
    GiamGia: { type: Number },
    startDate: { type: String },
    endDate: { type: String },
    productId: { type: Array },
    desc: {type: String}
  },
  { version: false, timestamps: true }
);

// define ID of object
Promotion.statics.objectId = function (id) {
  return mongoose.Types.objectId(id);
};

// export models
module.exports = {
  Promotion: mongoose.model("promotion", Promotion),
};