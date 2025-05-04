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
    name: string;
    email: string;
    role: UserRole;
    color: UserColor;
}
interface FullUser extends SafeUser {
    pass: string;
}
interface JwtPayload {
    data: string;
}

export { UserRole, UserColor, SafeUser, FullUser, JwtPayload };
