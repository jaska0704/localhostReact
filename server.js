const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 3600;

server.use(middlewares);
server.use(jsonServer.bodyParser);

const findUser = (identifier) => {
  return (
    db.get("users").find({ username: identifier }).value() ||
    db.get("users").find({ email: identifier }).value()
  );
};

server.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  if (
    db.get("users").find({ username }).value() ||
    db.get("users").find({ email }).value()
  ) {
    return res.status(400).json({ error: "Username or email already exists" });
  }

  const newUser = {
    id: db.get("users").length + 1,
    username,
    email,
    password,
    role: "regular",
  };
  db.get("users").push(newUser).write();

  res.status(201).json({ message: "User registered successfully" });
});

server.post("/login", (req, res) => {
  const { identifier, password } = req.body;

  const user = findUser(identifier);

  if (user && user.password === password) {
    const token = Math.random().toString(36).substr(2);
    return res.json({ message: "Login successful", user, token });
  } else {
    return res
      .status(401)
      .json({ error: "Invalid username/email or password" });
  }
});

const isAuthenticated = (req, res, next) => {
  const { token } = req.headers;

  if (!token) {
    return res.status(401).json({ error: "Token not provided" });
  }

  if (token.trim() !== "") {
    next();
  } else {
    return res.status(401).json({ error: "Invalid token" });
  }
};

server.get("/profile", isAuthenticated, (req, res) => {
  const { token } = req.headers;

  const user = db.get("users").find({ token }).value();

  if (user) {
    const userProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    res.json(userProfile);
  } else {
    return res.status(401).json({ error: "User not found" });
  }
});

server.post("/orders", isAuthenticated, (req, res) => {
  const order = req.body.order;
  res.status(201).json({ message: "Order placed successfully", order });
});

const isAdmin = (req, res, next) => {
  const { token } = req.headers;

  if (token && token.trim() !== "") {
    const user = db.get("users").find({ token }).value();
    if (user && user.role === "superadmin") {
      next();
    } else {
      return res.status(403).json({ error: "Unauthorized" });
    }
  } else {
    return res.status(401).json({ error: "Token not provided" });
  }
};

server.get("/admin/users", isAdmin, (req, res) => {
  const users = db.get("users").value();
  const sanitizedUsers = users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
  }));
  res.json(sanitizedUsers);
});

server.get("/admin/products", isAdmin, (req, res) => {
  const products = db.get("products").value();
  res.json(products);
});

server.use(router);

server.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
});
