# TaskFlow

Веб-приложение для управления проектами и задачами с ролевой моделью доступа (Client / Admin).

## Стек

- **Frontend:** React + Vite
- **Backend:** Node.js + Express + Prisma
- **Database:** PostgreSQL 16
- **Auth:** JWT + bcrypt
- **Infra:** Docker + Docker Compose

## Быстрый старт

```bash
cp .env.example .env
docker compose up --build
```

- UI: http://localhost:3000
- API: http://localhost:5000

## Структура

```
taskflow/
├── server/   # backend
├── client/   # frontend
├── docs/     # документация
└── docker-compose.yml
```

## Документация

См. `docs/` — описание проекта, use cases, архитектура.

## Лицензия

MIT