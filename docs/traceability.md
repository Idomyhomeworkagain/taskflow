# Матрица трассировки требований

| UC | Модуль | Endpoint | Модель | UI |
|----|--------|----------|--------|-----|
| UC-01 | Auth | POST /api/auth/register | User | Register.jsx |
| UC-02 | Auth | POST /api/auth/login | User | Login.jsx |
| UC-03 | Auth | POST /api/auth/logout | — | Header.jsx |
| UC-11 | Projects | POST /api/projects | Project | ProjectForm.jsx |
| UC-12 | Projects | GET /api/projects | Project | ProjectList.jsx |
| UC-13 | Projects | GET /api/projects/:id | Project | ProjectPage.jsx |
| UC-14 | Projects | PUT /api/projects/:id | Project | ProjectForm.jsx |
| UC-15 | Projects | DELETE /api/projects/:id | Project | ProjectList.jsx |
| UC-26 | Tasks | POST /api/tasks | Task | TaskForm.jsx |
| UC-27 | Tasks | GET /api/tasks/project/:id | Task | TaskList.jsx |
| UC-28 | Tasks | GET /api/tasks/:id | Task | TaskPage.jsx |
| UC-29 | Tasks | PUT /api/tasks/:id | Task | TaskCard.jsx |
| UC-30 | Tasks | DELETE /api/tasks/:id | Task | TaskList.jsx |
| UC-31 | Tasks | PUT /api/tasks/:id | Task | TaskForm.jsx |
| UC-32 | Tasks | PUT /api/tasks/:id | Task | TaskForm.jsx |
| UC-46 | Admin | GET /api/admin/users | User | AdminUsers.jsx |
| UC-47 | Admin | PUT /api/admin/users/:id/role | User | AdminUsers.jsx |
| UC-48 | Admin | DELETE /api/admin/users/:id | User | AdminUsers.jsx |
