//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
/*
O1.)After installing and requiring mongoose-findorcreate we get an error in vscode
  Could not find a declaration file for module 'mongoose-findorcreate'.
  'c:/Dev/Secrets/node_modules/mongoose-findorcreate/index.js'
  implicitly has an 'any' type. Try `npm i --save-dev @types/mongoose-findorcreate`
  if it exists or add a new declaration (.d.ts) file containing `declare module
  'mongoose-findorcreate';`
  ------------------
  To fix this, create a folder "types" in root directory of project, and create
  "mongoose-findorcreate" folder inside it. Now add a file index.d.ts with
  "declare module "mongoose-findorcreate";" inside it.
*/

const { Schema } = mongoose;
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// P1.)Set up and configure express-session
// P2.)Initialize passport
// P3.)Initialize passport session
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DATABASE_LINK, { useNewUrlParser: true });

const userSchema = new Schema({
  username: String,
  password: String,
  googleId: String,
  secret: String,
});

// P4.)Add passport-local-mongoose as a plugin to userSchema
userSchema.plugin(passportLocalMongoose);
// O2.)Add findorcreate as a plugin to userSchema.
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

// P5.)Create a local strategy to hash and salt passwords
// P6.)Serialize means to create a cookie.
// P7.)Deserialize means to "break" the cookie to get the information.
passport.use(User.createStrategy());
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
    });
  });
});
passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

/*
  O3.)Create a GoogleStrategy which will be used to authenticate user using Google OAUTH 2.0.
  The Google authentication strategy authenticates users using a Google account and
  OAuth 2.0 tokens. The client ID and secret obtained when creating an application are
  supplied as options when creating the strategy. The strategy also requires a verify
  callback, which receives the access token and optional refresh token, as well as
  profile which contains the authenticated user's Google profile. The verify callback
  must call cb providing a user to complete authentication.
*/
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
    },
    (accessToken, refreshToken, profile, cb) => {
      User.findOrCreate({ googleId: profile.id }, (err, user) => {
        return cb(err, user);
      });
    }
  )
);
app.get("/favicon.ico", (req, res) => res.status(204));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

/*
P8.)There is a issue, if we logout from "/secrets" and hit back button in browser,
  the browser will show us an older/cached version of the secrets page. To not show
  that and redirect to login page we wrote the app.set() code.

  Update: Since, secrets page is not a privelaged page anymore, the security functionalities are not
  needed for this page. The security codes are moved to the GET request for submit page
*/
app.get("/secrets", (req, res) => {
  User.find({ secret: { $ne: null } }, (err, results) => {
    if (err) {
      console.log(err);
    } else if (results) {
      res.render("secrets", { usersWithSecret: results });
    }
  });
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (!err) {
      res.redirect("/");
    } else {
      console.log(err);
    }
  });
});

app.get("/submit", (req, res) => {
  res.set(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stal e=0, post-check=0, pre-check=0"
  );
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

/*
O4.)This opens a popup which will ask user to login through google
  Authenticate the user, then fetch "profile" of user
  After this, Google will make a get request to the path specified in
  Authorized redirect URL field in Google Cloud Dashboard
*/
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

/*
O5.)Google will make GET request to the URL specified in Authorized
  redirect URL field. This request will redirect user to login page
  if authentication failed OR send to secrets upon success
*/
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/submit");
  }
);

/*
P9.)Since, we are registering a new user, as soon as user registers succesfully,
  he should be authenticated and sent to "/secrets".
*/
app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/submit");
        });
      }
    }
  );
});

/*
P10.)We FIRST AUTHENTICATE the user then use the req.login
  In the course, the passport.authenticate was used inside the req.login() method
  which caused a huge security leak - If we logout of authenticated session,
  then login again but with wrong pass, we would not redirect to "/secrets"
  but if we manually enter "/secrets" in browser the page would load.
  THAT WON'T HAPPEN AS WE'VE passed passport.authenticate as a paramenter hence it would
  run before req.login()
*/
app.post("/login", passport.authenticate("local"), (req, res) => {
  const newUser = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(newUser, (err) => {
    if (!err) {
      res.redirect("/submit");
    } else {
      console.log(err);
      res.redirect("/register");
    }
  });
});

app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret;
  switch (submittedSecret) {
    case null:
    case undefined:
      res.redirect("/secrets");
      break;
    default:
      if (submittedSecret.trim().length > 0) {
        User.findById(req.user.id, (err, result) => {
          if (err) {
            console.log(err);
          } else if (result) {
            result.secret = submittedSecret;
            result.save((err) => {
              if (err) {
                console.log(err);
              }
            });
          }
        });
      }
      res.redirect("/secrets");
      break;
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started at port 3000.");
});
