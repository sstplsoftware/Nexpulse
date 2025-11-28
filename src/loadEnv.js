// C:\NexPulse\backend\src\loadEnv.js
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ABSOLUTE PATH TO .env (WORKS 100%)
const ENV_PATH = path.join(__dirname, "..", ".env");

console.log("🔧 FORCED .env PATH =", ENV_PATH);

dotenv.config({ path: ENV_PATH });

console.log("🔧 AFTER LOAD JWT_SECRET =", process.env.JWT_SECRET);
