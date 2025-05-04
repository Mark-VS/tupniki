import type { SafeUser } from "./../user.js";

declare global {
    namespace Express {
        interface User extends SafeUser {}
    }
}