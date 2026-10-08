# TaskFlow — описание проекта

**Веб-приложение для управления проектами и задачами с ролевой моделью доступа.**

---

## 1. Аннотация

TaskFlow — это лёгкое веб-приложение для организации работы над проектами
небольшими командами. Система позволяет создавать проекты, ставить задачи,
отслеживать их выполнение и разграничивать права между двумя типами
пользователей: **Client** (заказчик/исполнитель) и **Admin** (администратор).

Приложение разворачивается одной командой `docker compose up` и работает
как на локальной машине разработчика, так и на сервере под управлением Linux.

---

## 2. Актуальность

Современные команды нуждаются в простом инструменте для постановки задач
и отслеживания прогресса. Существующие решения (Jira, Trello, Asana):

- избыточны по функциональности для малых команд;
- требуют оплаты за расширенные возможности;
- сложны в самостоятельном развёртывании.

**TaskFlow** решает эти проблемы: минимальный набор функций,
развёртывание в три команды, открытый исходный код.

---

## 3. Цель и задачи

**Цель:** разработать веб-приложение для управления проектами и задачами
с контейнерной архитектурой и ролевой моделью доступа.

**Задачи:**

1. Спроектировать модель данных (User, Project, Task).
2. Реализовать авторизацию с использованием JWT и bcrypt.
3. Реализовать CRUD-операции для двух бизнес-сущностей.
4. Разграничить доступ по ролям: Client / Admin.
5. Обеспечить развёртывание через Docker Compose.
6. Подготовить документацию: use cases, API, руководство пользователя.

---

## 4. Стек технологий

| Слой | Технология | Назначение |
|------|------------|------------|
| Frontend | React 18 + Vite | SPA-интерфейс |
| Backend | Node.js 20 + Express | REST API |
| ORM | Prisma 5 | Работа с БД, миграции |
| БД | PostgreSQL 16 | Хранение данных |
| Аутентификация | JWT + bcryptjs | Токены, хеширование паролей |
| Контейнеризация | Docker + Docker Compose | Развёртывание |
| Веб-сервер UI | Nginx (alpine) | Раздача статики |

**Почему такой стек:**

- **Node.js + React** — единый язык на клиенте и сервере.
- **Prisma** — типобезопасный доступ к БД, миграции под Git.
- **PostgreSQL** — надёжная реляционная СУБД с богатой экосистемой.
- **Docker Compose** — воспроизводимое окружение в одну команду.

---

## 5. Архитектура

Приложение разбито на три независимых контейнера, объединённых
внутренней Docker-сетью `taskflow-net`:

```
┌──────────────┐     HTTP      ┌──────────────┐    SQL     ┌──────────────┐
│   UI (React) │ ────────────► │  API (Node)  │ ─────────► │ PostgreSQL   │
│  :3000 → :80 │               │    :5000     │            │    :5432     │
└──────────────┘               └──────────────┘            └──────────────┘
        │                              │                          │
        └──────────── docker network: taskflow-net ───────────────┘
```

**Ключевые решения:**

- UI общается с API **с хоста** (`http://localhost:5000`), поэтому
  `localhost` в клиентском коде корректен.
- API общается с БД **внутри сети** по имени сервиса: `db:5432`.
- Данные БД хранятся в named volume `db_data` и переживают перезапуск.

---

## 6. Модель данных

### 6.1. User

| Поле | Тип | Ограничения |
|------|-----|-------------|
| id | UUID | PK, авто |
| email | string | unique |
| password | string | bcrypt-хеш |
| name | string? | nullable |
| role | enum | CLIENT \| ADMIN |
| createdAt | timestamp | auto |
| updatedAt | timestamp | auto |

### 6.2. Project

| Поле | Тип | Ограничения |
|------|-----|-------------|
| id | UUID | PK |
| title | string | обязательное |
| description | text? | nullable |
| archived | boolean | default false |
| ownerId | UUID | FK → User |
| createdAt | timestamp | auto |
| updatedAt | timestamp | auto |

### 6.3. Task

| Поле | Тип | Ограничения |
|------|-----|-------------|
| id | UUID | PK |
| title | string | обязательное |
| description | text? | nullable |
| status | enum | TODO \| IN_PROGRESS \| DONE |
| priority | int | default 1 |
| dueDate | timestamp? | nullable |
| projectId | UUID | FK → Project (Cascade) |
| assigneeId | UUID? | FK → User (SetNull) |
| createdAt | timestamp | auto |
| updatedAt | timestamp | auto |

**Связи:**

- `User 1 → N Project` (владелец)
- `User 1 → N Task` (исполнитель)
- `Project 1 → N Task` (каскадное удаление)

---

## 7. Роли и права доступа

### 7.1. Client

- Регистрируется самостоятельно.
- Видит и редактирует **только свои** проекты.
- Создаёт и назначает задачи в своих проектах.
- Не имеет доступа к разделу администрирования.

### 7.2. Admin

- Создаётся через seed или назначается другим админом.
- Видит **все** проекты и задачи.
- Управляет пользователями: список, смена роли, удаление.
- Может принудительно завершать сессии.

### 7.3. Матрица доступа

| Эндпоинт | Client | Admin |
|----------|:------:|:-----:|
| POST /api/auth/register | ✅ | ✅ |
| POST /api/auth/login | ✅ | ✅ |
| GET /api/auth/me | ✅ | ✅ |
| GET /api/projects (свои) | ✅ | ✅ |
| GET /api/projects (все) | ❌ | ✅ |
| POST /api/projects | ✅ | ✅ |
| PUT /api/projects/:id (свои) | ✅ | ✅ |
| PUT /api/projects/:id (чужие) | ❌ | ✅ |
| DELETE /api/projects/:id | ✅ (свои) | ✅ (любые) |
| POST /api/tasks | ✅ | ✅ |
| PUT /api/tasks/:id | ✅ | ✅ |
| GET /api/admin/users | ❌ | ✅ |
| PUT /api/admin/users/:id/role | ❌ | ✅ |
| DELETE /api/admin/users/:id | ❌ | ✅ |

---

## 8. Безопасность

1. **Пароли** — хешируются bcryptjs (10 rounds). Открытый пароль
   не хранится ни в БД, ни в логах.
2. **JWT** — подписывается секретом из `JWT_SECRET` (≥32 байт).
   Время жизни токена — 24 часа.
3. **Cookie** — передаётся как `httpOnly` + `sameSite=lax`.
   Защита от XSS и CSRF.
4. **CORS** — белый список origin, `credentials: true` для cookie.
5. **RBAC** — middleware `auth` + `requireRole`.
6. **Валидация** — входные данные проверяются на API.
7. **Секреты** — в `.env`, исключены из Git через `.gitignore`.

---

## 9. Use Cases

Полный список — в `docs/use-cases.md` (60 сценариев).
Минимально жизнеспособный продукт (MVP) — 20 сценариев:

- **Авторизация:** UC-01, UC-02, UC-03, UC-05.
- **Проекты CRUD:** UC-11, UC-12, UC-13, UC-14, UC-15, UC-16.
- **Задачи CRUD:** UC-26, UC-27, UC-28, UC-29, UC-30, UC-31, UC-32.
- **Администрирование:** UC-46, UC-47, UC-48.

Матрица трассировки «требование → API → UI» — в `docs/traceability.md`.

---

## 10. Развёртывание

### 10.1. Требования

- Docker Desktop (Windows/macOS) или Docker Engine (Linux)
- Docker Compose v2
- Свободные порты: 3000, 5000, 5432

### 10.2. Запуск

```bash
git clone https://github.com/<user>/taskflow.git
cd taskflow
cp .env.example .env
# отредактировать JWT_SECRET и POSTGRES_PASSWORD

docker compose up --build
```

### 10.3. Проверка

- UI: http://localhost:3000
- API health: http://localhost:5000/api/health
- БД check: http://localhost:5000/api/db-check

### 10.4. Тестовые учётные записи

| Email | Пароль | Роль |
|-------|--------|------|
| admin@taskflow.local | admin12345 | ADMIN |
| client@taskflow.local | client12345 | CLIENT |

> ⚠️ В продакшене эти учётки должны быть удалены или
> заменены на реальные с сильными паролями.

---

## 11. Структура репозитория

```
taskflow/
├── .env.example                # шаблон переменных окружения
├── .gitattributes              # правила окончаний строк
├── .gitignore
├── docker-compose.yml          # оркестрация трёх контейнеров
├── README.md                   # быстрый старт
├── docs/
│   ├── README.md               # этот документ
│   ├── use-cases.md            # 60 use cases
│   ├── use-cases.csv           # machine-readable версия
│   └── traceability.md         # связь UC ↔ API ↔ UI
├── server/                     # backend
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.js
│   │   └── migrations/
│   └── src/
│       ├── index.js
│       ├── db.js
│       ├── lib/jwt.js
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js
│           └── admin.js
└── client/                     # frontend
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/main.jsx
```

---

## 12. Дальнейшее развитие

- Раздел «Проекты» в UI: список, создание, редактирование, удаление.
- Раздел «Задачи»: канбан-доска, drag&drop, комментарии.
- Прикрепление файлов к задачам.
- Email-уведомления о дедлайнах.
- Ролевая модель с расширенными правами (например, «менеджер проекта»).
- Метрики и дашборд для администратора.
- Поддержка PWA и работа офлайн.
- Полнотекстовый поиск по задачам (Postgres GIN).
- Экспорт проектов в JSON/CSV.
- CI/CD через GitHub Actions.

---

## 13. Лицензия

MIT License. Полный текст — в файле `LICENSE` в корне репозитория.

---

*Дата последнего обновления: 2026-10-08*