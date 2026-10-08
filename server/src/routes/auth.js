import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../db.js";
import {
  signToken,
  COOKIE_NAME,
  COOKIE_OPTIONS,
} from "../lib/jwt.js";
import { auth } from "../middleware/auth.js";

const router = Router();

// --- POST /api/auth/register ---
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "password must be at least 6 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name: name || null,
        role: "CLIENT", // новый пользователь всегда CLIENT
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.status(201).json({ user, token });
  } catch (e) {
    console.error("[auth/register]", e);
    res.status(500).json({ error: "registration failed" });
  }
});

// --- POST /api/auth/login ---
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (e) {
    console.error("[auth/login]", e);
    res.status(500).json({ error: "login failed" });
  }
});

// --- POST /api/auth/logout ---
router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTIONS, maxAge: 0 });
  res.json({ ok: true });
});

// --- GET /api/auth/me ---
router.get("/me", auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: "user not found" });
    res.json({ user });
  } catch (e) {
    console.error("[auth/me]", e);
    res.status(500).json({ error: "failed to load profile" });
  }
});

export default router;