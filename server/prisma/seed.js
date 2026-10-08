import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("[seed] start");

  const adminPassword = await bcrypt.hash("admin12345", 10);
  const clientPassword = await bcrypt.hash("client12345", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@taskflow.local" },
    update: {},
    create: {
      email: "admin@taskflow.local",
      password: adminPassword,
      name: "Administrator",
      role: "ADMIN",
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@taskflow.local" },
    update: {},
    create: {
      email: "client@taskflow.local",
      password: clientPassword,
      name: "Test Client",
      role: "CLIENT",
    },
  });

  console.log("[seed] users:", admin.email, client.email);

  const project = await prisma.project.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: {},
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      title: "Demo Project",
      description: "РџРµСЂРІС‹Р№ РїСЂРѕРµРєС‚, СЃРѕР·РґР°РЅРЅС‹Р№ РІ seed",
      ownerId: client.id,
    },
  });

  console.log("[seed] project:", project.title);

  const tasksData = [
    { title: "Design DB schema", status: "DONE", priority: 1 },
    { title: "Implement auth", status: "IN_PROGRESS", priority: 2 },
    { title: "Write docs", status: "TODO", priority: 3 },
  ];

  for (const t of tasksData) {
    await prisma.task.create({
      data: {
        ...t,
        projectId: project.id,
        assigneeId: client.id,
        dueDate: new Date(Date.now() + t.priority * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log("[seed] tasks created:", tasksData.length);
  console.log("[seed] done");
}

main()
  .catch((e) => {
    console.error("[seed] error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });