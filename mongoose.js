const mongoose = require("mongoose");

const ConnectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://indrasena197:indrasena@cluster0.dov1iki.mongodb.net/todo", {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log("Connected to DB");
    } catch (err) {
        console.error("Error connecting to DB:", err);
        process.exit(1); // Exit the process if the connection fails
    }
};

const userSchema = new mongoose.Schema({
    email:{type:String ,unique:true,required:true},
    username: { type: String, unique: true, required: true }, // Corrected 'unquie' to 'unique'
    password: { type: String, required: true }
});

const todoSchema = new mongoose.Schema({
    title: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

// Creating the models from schemas
const User = mongoose.model('User', userSchema);
const Todo = mongoose.model('Todo', todoSchema);

// Export the models, not the schemas
module.exports = { User, Todo, ConnectDB };
