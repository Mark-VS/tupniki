enum UserRole {
    User = "user",
    Admin = "admin"
}
enum UserColor {
    Green = "green",
    Blue = "blue",
    Grey = "gray"
}
interface SafeUser {
    id: number;
    user: string;
    role: UserRole;
    color: UserColor;
}
interface User extends SafeUser {
    pass: string;
}

export { UserRole, UserColor, SafeUser, User };
