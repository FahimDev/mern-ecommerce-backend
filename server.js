require("dotenv").config();

const app = require("./src/app.js");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;
// Theory:
// The server file should only handle bootstrapping:
// 1. Load env variables
// 2. Connect database
// 3. Start HTTP listener
// This keeps app configuration testable and reusable.
const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`E-commerce API running on http://localhost:${PORT}`);
        console.log(`Swagger docs running on http://localhost:${PORT}/api-docs`);
    });
};

startServer();