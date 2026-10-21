import { Router } from "express";
import prisma from "../db.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth); // все роуты ниже требуют авторизации

// ─────────────────────────────────────────────────────────────
// CREATE: POST /api/projects
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "title is required" });
    }
    if (title.length > 200) {
      return res.status(400).json({ error: "title must be ≤ 200 chars" });
    }

    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        ownerId: req.user.id, // всегда владелец = текущий пользователь
      },
    });

    res.status(201).json({ project });
  } catch (e) {
    console.error("[projects/create]", e);
    res.status(500).json({ error: "failed to create project" });
  }
});

// ─────────────────────────────────────────────────────────────
// READ (list): GET /api/projects
// Client → только свои. Admin → все.
// Поддержка ?archived=true|false, ?q=поиск, ?page=&limit=
// ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { archived, q, page = "1", limit = "20" } = req.query;

    const where = {};

    // RBAC: Client видит только свои
    if (req.user.role !== "ADMIN") {
      where.ownerId = req.user.id;
    }

    if (archived === "true") where.archived = true;
    if (archived === "false") where.archived = false;

    if (q && typeof q === "string") {
      where.title = { contains: q, mode: "insensitive" };
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          owner: { select: { id: true, email: true, name: true } },
          _count: { select: { tasks: true } },
        },
      }),
    ]);

    res.json({
      projects,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (e) {
    console.error("[projects/list]", e);
    res.status(500).json({ error: "failed to list projects" });
  }
});

// ─────────────────────────────────────────────────────────────
// READ (one): GET /api/projects/:id
// ─────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, email: true, name: true } },
        tasks: {
          orderBy: { createdAt: "asc" },
          include: {
            assignee: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "project not found" });
    }

    // RBAC: Client может смотреть только свои проекты
    if (req.user.role !== "ADMIN" && project.ownerId !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }

    res.json({ project });
  } catch (e) {
    console.error("[projects/get]", e);
    res.status(500).json({ error: "failed to load project" });
  }
});

// ─────────────────────────────────────────────────────────────
// UPDATE: PUT /api/projects/:id
// ─────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { title, description, archived } = req.body;

    const existing = await prisma.project.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "project not found" });
    }

    // RBAC: Client может менять только свои
    if (req.user.role !== "ADMIN" && existing.ownerId !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }

    const data = {};
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "title must be non-empty" });
      }
      if (title.length > 200) {
        return res.status(400).json({ error: "title must be ≤ 200 chars" });
      }
      data.title = title.trim();
    }
    if (description !== undefined) {
      data.description = description?.trim() || null;
    }
    if (archived !== undefined) {
      if (typeof archived !== "boolean") {
        return res.status(400).json({ error: "archived must be boolean" });
      }
      data.archived = archived;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "nothing to update" });
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ project });
  } catch (e) {
    console.error("[projects/update]", e);
    res.status(500).json({ error: "failed to update project" });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE: DELETE /api/projects/:id
// ─────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { tasks: true } } },
    });
    if (!existing) {
      return res.status(404).json({ error: "project not found" });
    }

    // RBAC: Client может удалять только свои
    if (req.user.role !== "ADMIN" && existing.ownerId !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }

    await prisma.project.delete({ where: { id: req.params.id } });

    res.json({
      ok: true,
      deleted: {
        id: existing.id,
        title: existing.title,
        tasksCascadeDeleted: existing._count.tasks,
      },
    });
  } catch (e) {
    console.error("[projects/delete]", e);
    res.status(500).json({ error: "failed to delete project" });
  }
});

export default router;