import { Router } from "express";
import prisma from "../db.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);

const VALID_STATUSES = ["TODO", "IN_PROGRESS", "DONE"];

// Проверка: может ли пользователь работать с проектом
async function canAccessProject(userId, role, projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });
  if (!project) return { ok: false, code: 404, error: "project not found" };
  if (role !== "ADMIN" && project.ownerId !== userId) {
    return { ok: false, code: 403, error: "forbidden" };
  }
  return { ok: true, project };
}

// ─────────────────────────────────────────────────────────────
// CREATE: POST /api/tasks
// ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, projectId, assigneeId } = req.body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "title is required" });
    }
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "invalid status" });
    }

    const access = await canAccessProject(req.user.id, req.user.role, projectId);
    if (!access.ok) return res.status(access.code).json({ error: access.error });

    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assignee) return res.status(400).json({ error: "assignee not found" });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: status || "TODO",
        priority: Number.isInteger(priority) ? priority : 1,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assigneeId: assigneeId || null,
      },
    });

    res.status(201).json({ task });
  } catch (e) {
    console.error("[tasks/create]", e);
    res.status(500).json({ error: "failed to create task" });
  }
});

// ─────────────────────────────────────────────────────────────
// READ (list): GET /api/tasks?projectId=&status=&assigneeId=&page=&limit=
// ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { projectId, status, assigneeId, page = "1", limit = "50" } = req.query;

    const where = {};

    // RBAC: Client видит задачи только в своих проектах
    if (req.user.role !== "ADMIN") {
      where.project = { ownerId: req.user.id };
    }
    if (projectId) where.projectId = projectId;
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: "invalid status" });
      }
      where.status = status;
    }
    if (assigneeId) where.assigneeId = assigneeId;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const skip = (pageNum - 1) * limitNum;

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        skip,
        take: limitNum,
        include: {
          project: { select: { id: true, title: true } },
          assignee: { select: { id: true, email: true, name: true } },
        },
      }),
    ]);

    res.json({
      tasks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (e) {
    console.error("[tasks/list]", e);
    res.status(500).json({ error: "failed to list tasks" });
  }
});

// ─────────────────────────────────────────────────────────────
// READ (one): GET /api/tasks/:id
// ─────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, title: true, ownerId: true } },
        assignee: { select: { id: true, email: true, name: true } },
      },
    });

    if (!task) return res.status(404).json({ error: "task not found" });

    if (req.user.role !== "ADMIN" && task.project.ownerId !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }

    res.json({ task });
  } catch (e) {
    console.error("[tasks/get]", e);
    res.status(500).json({ error: "failed to load task" });
  }
});

// ─────────────────────────────────────────────────────────────
// UPDATE: PUT /api/tasks/:id
// ─────────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { ownerId: true } } },
    });
    if (!existing) return res.status(404).json({ error: "task not found" });

    if (req.user.role !== "ADMIN" && existing.project.ownerId !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }

    const { title, description, status, priority, dueDate, assigneeId } = req.body;
    const data = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "title must be non-empty" });
      }
      data.title = title.trim();
    }
    if (description !== undefined) data.description = description?.trim() || null;
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: "invalid status" });
      }
      data.status = status;
    }
    if (priority !== undefined) {
      if (!Number.isInteger(priority) || priority < 0) {
        return res.status(400).json({ error: "priority must be non-negative integer" });
      }
      data.priority = priority;
    }
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        data.assigneeId = null;
      } else {
        const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
        if (!assignee) return res.status(400).json({ error: "assignee not found" });
        data.assigneeId = assigneeId;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "nothing to update" });
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ task });
  } catch (e) {
    console.error("[tasks/update]", e);
    res.status(500).json({ error: "failed to update task" });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE: DELETE /api/tasks/:id
// ─────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { ownerId: true } } },
    });
    if (!existing) return res.status(404).json({ error: "task not found" });

    if (req.user.role !== "ADMIN" && existing.project.ownerId !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }

    await prisma.task.delete({ where: { id: req.params.id } });

    res.json({ ok: true, deleted: { id: existing.id, title: existing.title } });
  } catch (e) {
    console.error("[tasks/delete]", e);
    res.status(500).json({ error: "failed to delete task" });
  }
});

export default router;