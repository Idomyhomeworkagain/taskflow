import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

if (!SECRET || SECRET.length < 16) {
  throw new Error(
    "JWT_SECRET is missing or too short. Set it in .env (min 16 chars)."
  );
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

export const COOKIE_NAME = "token";
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: false, // true, если работаете через HTTPS
  maxAge: 24 * 60 * 60 * 1000, // 24 часа в миллисекундах
  path: "/",
};