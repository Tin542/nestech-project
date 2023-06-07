"use strict";
const User = require("../models/user").User;
const bcrypt = require("bcrypt"); // encrypt password
const jwt = require("jsonwebtoken");
const LocalStorage = require("node-localstorage").LocalStorage;
const localStorage = new LocalStorage("./localStorage");
const CONFIG = require("../config");

function AuthController() {
  // chua global var
  const SELF = {
    enCodePass: (password) => {
      return bcrypt
        .hash(password, 10) // change encode password - 10 : salt
        .then((hash) => {
          return Promise.resolve(hash);
        })
        .catch((err) => {
          Logger.error(`encrypt password fail: ${err}`);
        });
    },
  };
  return {
    register: async (req, res) => {
      try {
        let data = req.body; // data register

        // check validate
        if (
          !data?.fullname ||
          !data?.username ||
          !data?.email ||
          !data?.password
        ) {
          return res.render("pages/auth/register.ejs", {
            s: 400,
            msg: "Vui lòng điền đầy đủ thông tin",
          });
        }
        if (data?.password !== data?.rePassword) {
          return res.render("pages/auth/register.ejs", {
            s: 400,
            msg: "Mật khẩu chưa trùng khớp",
          });
        }

        // check if user is already registered
        const userInfo = await User.findOne({
          $or: [{ email: data?.email }, { username: data?.username }], // find user by email or username
        }).lean(); // lean() => tăng hiệu suất truy vấn
        if (userInfo) {
          return res.render("pages/auth/register.ejs", {
            s: 400,
            msg: "Tài khoản hoặc email đã tồn tại",
          });
        }

        // register user
        return SELF.enCodePass(data?.password).then((hash) => {
          let otp = (Math.random() + 1).toString(36).substring(6); // create random OTP
          return User.create({
            fullname: data?.fullname,
            username: data?.username,
            password: hash,
            email: data?.email,
            otp: otp,
          })
            .then(async (rs) => {
              await localStorage.setItem("email", data?.email);
              return res.redirect("/auth/verifyEmail");
            })
            .catch((err) => {
              console.log("register user error: ", err);
            });
        });
      } catch (error) {
        console.log("register error: ", error);
      }
    },
    verify: async (req, res) => {
      try {
        let data = req.body;
        if (!data?.otp) {
          return res.render("pages/auth/verifyEmail.ejs", {
            s: 400,
            msg: "Vui lòng nhập OTP",
          });
        }
        const emailLocalStorage = await localStorage.getItem("email");
        return User.findOne({ otp: data?.otp, email: emailLocalStorage })
          .lean()
          .then(async (userInfo) => {
            if (userInfo) {
              userInfo.active = true;
              userInfo.otp = "";
              await User.updateOne({ _id: userInfo._id }, userInfo);
              res.redirect("/auth/login");
            } else {
              return res.render("pages/auth/verifyEmail.ejs", {
                s: 400,
                msg: "OTP chưa chính xác",
              });
            }
          })
          .catch((e) => {
            Logger.error(`Find one user fail: ${e}`);
          });
      } catch (error) {
        Logger.error(`verify - fail: ${error}`);
      }
    },
    login: async (req, res) => {
      try {
        let data = req.body;
        if (!data?.username || !data?.password) {
          return res.render("pages/auth/login.ejs", {
            s: 400,
            msg: "Tài khoản hoặc mật khẩu đang trống",
          });
        }
        let userInfo = await User.findOne({ username: data?.username }).lean();
        if (!userInfo) {
          return res.render("pages/auth/login.ejs", {
            s: 404,
            msg: `Tài khoản ${data?.username} Không tồn tại`,
          });
        }
        if (!userInfo.active) {
          return res.render("pages/auth/login.ejs", {
            s: 400,
            msg: `Tài khoản ${data?.username} chưa xác thực`,
          });
        }
        return bcrypt
          .compare(data?.password, userInfo.password)
          .then(async (rs) => {
            if (rs) {
              const token = jwt.sign(
                {
                  userId: userInfo._id,
                  email: userInfo?.email,
                },
                CONFIG.SERECT_KEY,
                { expiresIn: "100h" }
              );
              userInfo.token = token;
              await User.updateOne({ _id: userInfo._id }, userInfo);
              let session = req.session;
              session.userId = token;
              res.redirect("/");
            } else {
              res.render("pages/auth/login.ejs", {
                s: 400,
                msg: "Mật khẩu không chính xác",
              });
            }
          })
          .catch();
      } catch (error) {
        console.log("login error: " + error);
      }
    },
    sendOTP: async (req, res) => {
      try {
        let data = req.body;
        let otp = (Math.random() + 1).toString(36).substring(6);
        let userInfo = await User.findOne({ email: data?.email }).lean();
        if (!userInfo) {
          return res.send("pages/auth/verifyEmailForReset.ejs", {
            s: 404,
            msg: `Email ${data?.email} Không tồn tại`,
          });
        }
        await localStorage.setItem("email", data?.email);
        return User.findByIdAndUpdate(userInfo._id, { otp: otp })
          .then((rs) => {
            if (rs) {
              res.render("pages/auth/verifyEmailForReset.ejs", {
                isShowed: true,
              });
            }
          })
          .catch((err) => {
            console.log(err);
          });
      } catch (error) {
        console.log("error sen otp: " + error);
      }
    },
    verifyEmailForReset: async (req, res) => {
      try {
        let data = req.body;
        if (!data?.otp) {
          return res.render("pages/auth/verifyEmailForReset.ejs", {
            s: 400,
            isShowed: true,
            msg: "Vui lòng nhập OTP",
          });
        }
        const emailLocalStorage = await localStorage.getItem("email");
        return User.findOne({ otp: data?.otp, email: emailLocalStorage })
          .lean()
          .then(async (userInfo) => {
            if (userInfo) {
              userInfo.active = true;
              userInfo.otp = "";
              await User.updateOne({ _id: userInfo._id }, userInfo);
              res.redirect("/auth/reset");
            } else {
              return res.render("pages/auth/verifyEmailForReset.ejs", {
                s: 400,
                isShowed: true,
                msg: "OTP chưa chính xác",
              });
            }
          })
          .catch((e) => {
            Logger.error(`Find one user fail: ${e}`);
          });
      } catch (error) {
        Logger.error(`verify - fail: ${error}`);
      }
    },
    reset: async (req, res) => {
      try {
        let data = req.body; // data reset

        // check validate
        if (data?.password !== data?.rePassword) {
          return res.render("pages/auth/resetPassword.ejs", {
            s: 400,
            msg: "Mật khẩu chưa trùng khớp",
          });
        }

        const emailLocalStorage = await localStorage.getItem("email");
        // check if user is already registered
        const userInfo = await User.findOne({
          email: emailLocalStorage,
        }).lean(); // lean() => tăng hiệu suất truy vấn
        if (!userInfo) {
          return res.render("pages/auth/resetPassword.ejs", {
            s: 400,
            msg: "Người dùng không tồn tại",
          });
        }

        // reset password
        return SELF.enCodePass(data?.password).then(async (hash) => {
          try {
            const rs = await User.findByIdAndUpdate(userInfo._id, {
              password: hash,
            });
            return await res.redirect("/auth/login");
          } catch (err) {
            console.log("reset password error: ", err);
          }
        });
      } catch (error) {
        console.log("reset error: ", error);
      }
    },
    checkLogin: async (req, res, next) => {
      try {
        let session = req.session;
        if (session.userId) {
          //Todo: token => verify Database
          return next();
        } else {
          return res.redirect("/auth/login");
        }
      } catch (error) {
        Logger.error(`checkLogin - fail: ${error}`);
      }
    },
  };
}

module.exports = new AuthController();
