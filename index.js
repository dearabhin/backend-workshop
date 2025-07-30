const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = 3000;

app.use(express.json());

mongoose
  .connect(
    "mongodb+srv://literalshit3:6heVGfgvUbvo0NIT@cluster0.n8iwve9.mongodb.net"
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

function helloWorld(req, res) {
  res.json("Hello, world");
}


async function login(req, res) {
  console.log(req.body);
  const { username, password } = req.body;

  const existinguser = await User.findOne({ username });
  if (existinguser != null) {
    if (existinguser.password === password) {
      return res.json({ message: "Login successful" });
    }
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const newUser = new User({ username, password });
  await newUser.save();
  return res.json({ message: "User registered successfully" });
}


app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Error fetching users", details: err.message });
  }
});

app.post("/login", login);
app.get("/", helloWorld);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
