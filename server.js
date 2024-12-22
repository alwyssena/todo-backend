const express = require("express");
const app = express();

const { ConnectDB, User, Todo } = require('./mongoose');
ConnectDB();
const bodyparser = require("body-parser");

app.use(bodyparser.json());
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const access = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1]; // Extract token safely
    if (!token) {
        return res.status(401).json({ message: "Authorization token missing" });
    }

    try {
        const decoded = jwt.verify(token, "indra"); // Replace 'indra' with your secret key
        
        req.userId = decoded.userId; // Attach userId to the request object
        console.log("User ID decoded:", req.userId); // Log userId for debugging

        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};

// User registration endpoint
app.post("/register", async (req, res) => {
    const { email, username, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashPwd = await bcrypt.hash(password, 10);
        const newUser = new User({
            email,
            username,
            password: hashPwd
        });

        await newUser.save();
        res.status(201).json({
            message: "User registered successfully",
            user: {
                email: newUser.email,
                username: newUser.username
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error registering user', error: err.message });
    }
});

// User login endpoint
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ message: "Incorrect password" });
        }

        const payload = {
            userId: user._id,
            email: user.email
        };
        const token = jwt.sign(payload, "indra", { expiresIn: '1D' }); // Sign the token

        res.status(200).json({
            message: "Login successful",
            token: token
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});



app.get("/todos", access, async (req, res) => {
    // Check if the user is authenticated
    if (!req.userId) {
        return res.status(400).json({ message: "User not authenticated" });
    }

    try {
        // Retrieve all Todos for the authenticated user
        const todos = await Todo.find({ userId: req.userId });

        if (!todos.length) {
            return res.status(404).json({ message: "No Todos found for this user" });
        }

        // Send the list of Todos as the response
        res.status(200).json({ message: "Todos retrieved successfully", todos });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error retrieving Todos", error: err.message });
    }
});



// Create Todo endpoint
app.post("/todos", access, async (req, res) => {
    const { title } = req.body;
    if (!title) {
        return res.status(400).json({ message: "Title is required" });
    }

    if (!req.userId) {
        return res.status(400).json({ message: "User not authenticated" });
    }

    try {
        const newTodo = new Todo({
            title,
            userId: req.userId // Associate the Todo with the authenticated user
        });

        await newTodo.save();
        res.status(201).json({ message: "Todo created successfully", todo: newTodo });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating todo", error: err.message });
    }
});

app.put("/update/:id", access, async (req, res) => {
    const { title, status } = req.body;
    const todoId = req.params.id; 

    
    if (!title || !status) {
        return res.status(400).json({ message: "Title and status are required" });
    }

  
    if (!req.userId) {
        return res.status(400).json({ message: "User not authenticated" });
    }

    try {
        const todo = await Todo.findOne({ _id: todoId, userId: req.userId });

        if (!todo) {
            return res.status(404).json({ message: "Todo not found or user not authorized to update this Todo" });
        }
todo.set({
    title :title,
    status :status
})
        

        // Save the updated Todo
        await todo.save();

        // Send a response with the updated Todo
        res.status(200).json({ message: "Todo updated successfully", todo });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating Todo", error: err.message });
    }
});



app.delete("/todos", access, async (req, res) => {
    // Check if the user is authenticated
    if (!req.userId) {
        return res.status(400).json({ message: "User not authenticated" });
    }

    try {
        // Delete all Todos that belong to the authenticated user
        const result = await Todo.deleteMany({ userId: req.userId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "No Todos found to delete for this user" });
        }

        // Send success response after deleting all Todos
        res.status(200).json({ message: "All Todos deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting Todos", error: err.message });
    }
});


app.delete("/todo/:id", access, async (req, res) => {
    const todoId = req.params.id; // Extract Todo ID from the route parameters

    // Check if the user is authenticated
    if (!req.userId) {
        return res.status(400).json({ message: "User not authenticated" });
    }

    try {
        // Find the Todo by its ID and userId to ensure that only the authenticated user can delete their own Todo
        const todo = await Todo.findOne({ _id: todoId, userId: req.userId });

        if (!todo) {
            return res.status(404).json({ message: "Todo not found or user not authorized to delete this Todo" });
        }

        // Delete the Todo
        await Todo.deleteOne({ _id: todoId });

        // Send a success response
        res.status(200).json({ message: "Todo deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting Todo", error: err.message });
    }
});


// Start the server
app.listen(3000, () => {
    console.log("Server Started on port 3000");
});
