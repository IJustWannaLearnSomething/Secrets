//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const { Schema } = mongoose;
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });

const userSchema = new Schema({
  email: String,
  password: String,
});

userSchema.plugin(encrypt, {
  secret: process.env.SECRET,
  encryptedFields: ["password"],
});

const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/register", (req, res) => {
  const newUser = new User({
    email: req.body.email,
    password: req.body.password,
  });

  newUser.save((err) => {
    if (!err) {
      res.render("secrets");
    } else {
      console.log(err);
    }
  });
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // User.findOne({ email: email, password: password }, (err, result) => {
  //   if (!err) {
  //     if (result) {
  //       res.render("secrets");
  //     } else {
  //       res.redirect("login");
  //     }
  //   } else {
  //     console.log(err);
  //   }
  // });

  User.findOne({ email: email }, (err, result) => {
    if (!err) {
      if (result) {
        if (result.password === password) {
          res.render("secrets");
        } else {
          res.redirect("login");
        }
      } else {
        res.redirect("login");
      }
    } else {
      console.log(err);
    }
  });
});

app.listen(3000, () => {
  console.log("Server started at port 3000.");
});
