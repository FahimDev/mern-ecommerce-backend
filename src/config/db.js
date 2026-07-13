const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        // Theory:
        // Mongoose creates a connection layer between Express and MongoDB.
        // Keep connection logic in one place so all modules share the same DB connection.
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error("MONGO_URI is not defined. Did you create a .env file?");
        }

        await mongoose.connect(uri);

        console.log("MongoDB connected");

    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        // In production, if DB is not available at startup, the app is not healthy.
        process.exit(1);

    }
};

module.exports = connectDB;