import { verifyToken, COOKIE_NAME } from "../lib/jwt.js";

export function auth(req, res, next) {
  let token = req.cookies?.[COOKIE_NAME];

  // Fallback: Authorization: Bearer <token>
  if (!token) {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      token = header.slice(7);
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: no token" });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, role: payload.role, email: payload.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized: invalid token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}