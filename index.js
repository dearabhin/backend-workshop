const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect("mongodb+srv://literalshit3:6heVGfgvUbvo0NIT@cluster0.n8iwve9.mongodb.net")
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  messages: [{ sender: String, receiver: String, message: String }],
});

const User = mongoose.model("User", userSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  message: String,
});

const Message = mongoose.model("Message", messageSchema);

// Send Message
async function sendMessage(req, res) {
  const { sender, receiver, message } = req.body;

  try {
    const newMessage = new Message({ sender, receiver, message });
    await newMessage.save();

    // Push message into sender and receiver's messages array
    await User.findOneAndUpdate(
      { username: sender },
      { $push: { messages: { sender, receiver, message } } }
    );

    await User.findOneAndUpdate(
      { username: receiver },
      { $push: { messages: { sender, receiver, message } } }
    );

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
}

app.post("/send-message", sendMessage);

// NEW: Get all messages between two users
app.get("/messages/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    }).sort({ _id: 1 }); // oldest to newest

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Login / Register
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

app.post("/login", login);


// Get all users
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Error fetching users", details: err.message });
  }
});

// Hello World
function helloWorld(req, res) {
  res.json("Hello, world");
}
app.get("/", helloWorld);

// NEW: Get user's own messages
app.get("/my-messages/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user.messages);
  } catch (error) {
    console.error("Error fetching user's messages:", error);
    res.status(500).json({ error: "Failed to fetch user's messages" });
  }
});
const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const userMap = new Map();

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  socket.emit("join");
  socket.on("join", (username) => {
    userMap.set(username, socket.id);
    console.log(`User ${username} joined with socket ID: ${socket.id}`);
  });
});

// Update sendMessage to use socket.io
async function sendMessageSocket(req, res) {
  const { sender, receiver, message } = req.body;
  console.log("Received message:", { sender, receiver, message });

  try {
    const newMessage = new Message({ sender, receiver, message });
    await newMessage.save();

    // Push message into sender and receiver's messages array
    await User.findOneAndUpdate(
      { username: sender },
      { $push: { messages: { sender, receiver, message } } }
    );

    await User.findOneAndUpdate(
      { username: receiver },
      { $push: { messages: { sender, receiver, message } } }
    );

    // Emit message to receiver if they are online
    if (userMap.has(receiver)) {
      io.to(userMap.get(receiver)).emit("message", newMessage);
    }

    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
}

// Replace existing sendMessage route with the socket-enabled one
app.post("/send-message", sendMessageSocket);

// Update app.listen to use httpServer
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
