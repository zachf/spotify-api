import "dotenv/config";
import { getAccessToken } from "./auth/index.js";
import { runShell } from "./ui/shell.js";

const token = await getAccessToken();
await runShell(token);
