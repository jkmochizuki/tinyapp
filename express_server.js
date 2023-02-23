const express = require("express");
const bcrypt = require("bcryptjs");
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 8080;


const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "aH45JH"
  },
  "ism5xK": {
    longURL: "http://www.google.com",
    userId: "jaG38G"
  }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

const generateRandomString = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = "";
  for (let i = 0; i < 6; i++) {
    randomString += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomString;
};

const getUserByEmail = function(email) {
  for (const key in users) {
    if (users[key]["email"] === email) {
      return users[key];
    }
  }
  return null;
};

const urlsForUser = function(id) {
  let result = {};
  for (const key in urlDatabase) {
    if (urlDatabase[key].userId === id) {
      result[key] = {
        longURL: urlDatabase[key].longURL
      };
    }
  }
  return result;
};

app.set("view engine", "ejs");

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// Passes the URL data to the template
app.get("/urls", (req, res) => {
  const userId = req.cookies["user_id"];
  if (!userId) {
    return res.send("<html><body><h2>Please login or register first.</h2></body></html>");
  }
  const templateVars = {
    user: users[userId],
    urls: urlsForUser(userId)
  };
  res.render("urls_index", templateVars);
});

// Page to create new tinyURL
app.get("/urls/new", (req, res) => {
  const userId = req.cookies["user_id"];
  if (!userId) {
    return res.redirect('/login');
  }
  const templateVars = {
    user: users[userId]
  };
  res.render("urls_new", templateVars);
});

// Submits new URL
app.post("/urls", (req, res) => {
  const userId = req.cookies["user_id"];
  if (!userId) {
    return res.send("<html><body><h2>Please login to create new shortURL\n</h2>/body></html>");
  }
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: req.body["longURL"],
    userId: userId
  };
  res.redirect(`/urls/${shortURL}`);
});

// Shows generated tinyURL
app.get("/urls/:id", (req, res) => {
  const userId = req.cookies["user_id"];
  if (!userId) {
    return res.send("<html><body><h2>Please login or register first.</h2></body></html>");
  }
  if (!(req.params.id in urlsForUser(userId))) {
    return res.status(404).send("<html><body><h2>Page not found.\n</h2><h3>The requested URL page was not found on this server.</h3></body></html>\n");
  }
  const templateVars = {
    user: users[userId],
    id: req.params.id,
    longURL: urlDatabase
  };
  res.render("urls_show", templateVars);
});

// Accesses URL page through tinyURL
app.get("/u/:id", (req, res) => {
  const userId = req.cookies["user_id"];
  if (!userId) {
    return res.send("<html><body><h2>Please login or register first.</h2></body></html>");
  }
  if (!(req.params.id in urlsForUser(userId))) {
    return res.status(404).send("<html><body><h2>Page not found.\n</h2><h3>The requested URL page was not found on this server.</h3></body></html>\n");
  }
  const longURL = urlDatabase[req.params.id]["longURL"];
  res.redirect(longURL);
});

// Deletes URLs
app.post("/urls/:id/delete", (req, res) => {
  const userId = req.cookies["user_id"];
  if (!userId) {
    return res.send("<html><body><h2>Please login or register first.</h2></body></html>");
  }
  if (!(req.params.id in urlsForUser(userId))) {
    return res.status(404).send("<html><body><h2>ShortURL does not exist.\n</h2></body></html>\n");
  }
  delete urlDatabase[req.params.id];
  res.redirect(`/urls`);
});

// Redirects to the page to update URL
app.post("/urls/:id/edit", (req, res) => {
  const userId = req.cookies["user_id"];
  if (!userId) {
    return res.send("<html><body><h2>Please login or register first.</h2></body></html>");
  }
  if (!(req.params.id in urlsForUser(userId))) {
    return res.status(404).send("<html><body><h2>ShortURL does not exist.\n</h2></body></html>\n");
  }
  res.redirect(`/urls/${req.params.id}`);
});

// Updates URLs
app.post("/urls/:id", (req, res) => {
  const userId = req.cookies["user_id"];
  urlDatabase[req.params.id] = {
    longURL: req.body["longURL"],
    userId: userId
  };
  res.redirect(`/urls`);
});

// Submits login info and sets the cookie
app.post("/login", (req, res) => {
  const userEmail = req.body["email"];
  const userPassword = req.body["password"];
  const userInTheDatabase = getUserByEmail(userEmail);
  if (!userInTheDatabase) {
    return res.sendStatus(403);
  }
  if (!bcrypt.compareSync(userPassword, userInTheDatabase.password)) {
    return res.sendStatus(403);
  }
  res.cookie(`user_id`, `${userInTheDatabase.id}`);
  res.redirect(`/urls`);
});

// Logout and clear the cookie
app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect(`/login`);
});

// Register page
app.get("/register", (req, res) => {
  const userId = req.cookies["user_id"];
  if (users[userId]) {
    return res.redirect('/urls');
  }
  const templateVars = {
    user: users[userId],
  };
  res.render("register", templateVars);

});

// Submits new user registration
app.post("/register", (req, res) => {
  const userEmail = req.body["email"];
  const userPassword = req.body["password"];
  const hashedPassword = bcrypt.hashSync(userPassword, 10);
  if (!userEmail || !userPassword || getUserByEmail(userEmail)) {
    return res.sendStatus(400);
  } else {
    const userRandomID = generateRandomString();
    users[userRandomID] = {
      id: userRandomID,
      email: userEmail,
      password: hashedPassword
    };
    res.cookie(`user_id`, `${userRandomID}`);
    res.redirect(`/urls`);
  }
});

// Login page
app.get("/login", (req, res) => {
  const userId = req.cookies["user_id"];
  if (userId) {
    return res.redirect('/urls');
  }
  const templateVars = {
    user: users[userId],
  };
  res.render("login", templateVars);
});

// Logout and clear the cookie
app.post("/logout", (req, res) => {
  res.clearCookie('username', `${req.body["username"]}`);
  res.redirect(`/urls`);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});