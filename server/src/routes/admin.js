import { Router } from "express";
import prisma from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = Router();

// Все роуты ниже — только для ADMIN
router.use(auth, requireRole("ADMIN"));

// GET /api/admin/users — список всех пользователей
router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

// PUT /api/admin/users/:id/role — смена роли
router.put("/users/:id/role", async (req, res) => {
  const { role } = req.body;
  if (!["CLIENT", "ADMIN"].includes(role)) {
    return res.status(400).json({ error: "role must be CLIENT or ADMIN" });
  }

  // Защита: нельзя разжаловать самого себя
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: "cannot change your own role" });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, role: true },
    });
    res.json({ user });
  } catch {
    res.status(404).json({ error: "user not found" });
  }
});

// DELETE /api/admin/users/:id — удаление
router.delete("/users/:id", async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: "cannot delete yourself" });
  }
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "user not found" });
  }
});

export default router;