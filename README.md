# Secrets

# includes

```
const encrypt = require("mongoose-encryption");
const md5 = require("md5");
const bcrypt = require("bcrypt");
```

# for encryption

```
// --------------------------------Encryption using secret key
userSchema.plugin(encrypt, {
   secret: process.env.SECRET,
   encryptedFields: ["password"],
});
```

# for bcrypt hashing (register)

```
const saltrounds = 10;
//--------------------------------for bcrypt hashing
bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
    if (!err) {
        const newUser = new User({
            email: req.body.email,
            password: hash,
        });
        newUser.save((err) => {
            if (!err) {
                res.render("secrets");
            } else {
                console.log(err);
            }
        });
    } else {
       console.log(err);
     }
   });
```

# for md5 hashing (register)

```
// --------------------------------MD5 hashing
const newUser = new User({
    email: req.body.email,
    password: md5(req.body.password),
});
newUser.save((err) => {
    if (!err) {
      res.render("secrets");
    } else {
      console.log(err);
    }
});
```

# for md5 hashing (login)

```
const password = md5(req.body.password); //md5 hashing

//--------------------------------for MD5 hashing and encryption
User.findOne({ email: email, password: password }, (err, result) => {
    if (!err) {
        if (result) {
            res.render("secrets");
        } else {
            res.redirect("login");
        }
    } else {
       console.log(err);
    }
  });
```

# for bcrypt hashing (login)

```
//--------------------------------for bcrypt hashing
User.findOne({ email: email }, (err, result) => {
    if (!err) {
        if (result) {
            bcrypt.compare(password, result.password, (err, found) => {
                if (found) {
                    res.render("secrets");
                } else {
                    res.redirect("login");
                }
            });
        } else {
            res.redirect("login");
        }
    } else {
        console.log(err);
    }
});
```
