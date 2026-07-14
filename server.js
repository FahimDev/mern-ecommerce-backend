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
        const apiUrl = `http://localhost:${PORT}`;
        const swaggerUrl = `${apiUrl}/api-docs`;
        // Mongo Express runs in docker-compose on host port 8081.
        const mongoExpressUrl = `http://localhost:8081`;

        console.log("\n🚀 E-commerce API is up");
        console.log("------------------------------------------------------------");
        console.log(`  API          → ${apiUrl}`);
        console.log(`  Swagger UI   → ${swaggerUrl}`);
        console.log(`  OpenAPI JSON → ${apiUrl}/openapi.json`);
        console.log(`  Mongo UI     → ${mongoExpressUrl}  (user: teacher / pass: teacher123)`);
        console.log("------------------------------------------------------------\n");
    });
};

startServer();