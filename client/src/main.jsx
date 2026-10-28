import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

const API = "";
axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Состояния для авторизации
  const [email, setEmail] = useState("admin@taskflow.local");
  const [password, setPassword] = useState("admin12345");
  const [authError, setAuthError] = useState("");

  // Состояния для навигации
  const [currentProject, setCurrentProject] = useState(null);

  // Проверка авторизации при загрузке
  useEffect(() => {
    axios.get(`${API}/api/auth/me`)
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      const r = await axios.post(`${API}/api/auth/login`, { email, password });
      setUser(r.data.user);
    } catch (err) {
      setAuthError(err.response?.data?.error || "login failed");
    }
  };

  const logout = async () => {
    await axios.post(`${API}/api/auth/logout`);
    setUser(null);
    setCurrentProject(null);
  };

  if (loading) return <p style={{ padding: 32 }}>Загрузка...</p>;

  // ЭКРАН АВТОРИЗАЦИИ
  if (!user) {
    return (
      <main style={{ fontFamily: "system-ui", padding: 32, maxWidth: 480 }}>
        <h1>🐳 TaskFlow</h1>
        <form onSubmit={login}>
          <h2>Вход</h2>
          <div style={{ marginBottom: 8 }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 8 }} placeholder="Email" />
          </div>
          <div style={{ marginBottom: 8 }}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: 8 }} placeholder="Пароль" />
          </div>
          {authError && <p style={{ color: "red" }}><small>{authError}</small></p>}
          <button type="submit" style={{ padding: "8px 16px" }}>Войти</button>
        </form>
      </main>
    );
  }

  // ГЛАВНЫЙ ЭКРАН (после входа)
  return (
    <main style={{ fontFamily: "system-ui", padding: 32, maxWidth: 800 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid #ccc", paddingBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>🐳 TaskFlow</h1>
          <small>Пользователь: <strong>{user.email}</strong> ({user.role})</small>
        </div>
        <button onClick={logout} style={{ padding: "8px 16px", cursor: "pointer" }}>Выйти</button>
      </header>

      {currentProject ? (
        <TaskBoard project={currentProject} onBack={() => setCurrentProject(null)} user={user} />
      ) : (
        <ProjectList user={user} onSelectProject={setCurrentProject} />
      )}
    </main>
  );
}

// КОМПОНЕНТ: СПИСОК ПРОЕКТОВ (CRUD #1)
function ProjectList({ user, onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [title, setTitle] = useState("");

  const loadProjects = () => {
    axios.get(`${API}/api/projects`).then((r) => setProjects(r.data.projects));
  };

  useEffect(() => { loadProjects(); }, []);

  const createProject = async (e) => {
    e.preventDefault();
    if (!title) return;
    await axios.post(`${API}/api/projects`, { title });
    setTitle("");
    loadProjects();
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Удалить проект и все его задачи?")) return;
    await axios.delete(`${API}/api/projects/${id}`);
    loadProjects();
  };

  return (
    <div>
      <h2>Ваши проекты</h2>
      
      <form onSubmit={createProject} style={{ marginBottom: 24, display: "flex", gap: 8 }}>
        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="Название нового проекта..." 
          style={{ flex: 1, padding: 8 }} 
        />
        <button type="submit" style={{ padding: "8px 16px" }}>Создать</button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {projects.map((p) => (
          <li key={p.id} style={{ border: "1px solid #ccc", padding: 16, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 8px 0" }}>{p.title}</h3>
              <small>Задач в проекте: {p._count.tasks} | Владелец: {p.owner.email}</small>
            </div>
            <div>
              <button onClick={() => onSelectProject(p)} style={{ marginRight: 8 }}>Открыть задачи</button>
              {(user.role === "ADMIN" || user.id === p.ownerId) && (
                <button onClick={() => deleteProject(p.id)} style={{ color: "red" }}>Удалить</button>
              )}
            </div>
          </li>
        ))}
        {projects.length === 0 && <p>Нет проектов. Создайте первый!</p>}
      </ul>
    </div>
  );
}

// КОМПОНЕНТ: ДОСКА ЗАДАЧ (CRUD #2)
function TaskBoard({ project, onBack, user }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("TODO");

  const loadTasks = () => {
    axios.get(`${API}/api/tasks?projectId=${project.id}`).then((r) => setTasks(r.data.tasks));
  };

  useEffect(() => { loadTasks(); }, [project.id]);

  const createTask = async (e) => {
    e.preventDefault();
    if (!title) return;
    await axios.post(`${API}/api/tasks`, { title, projectId: project.id, status });
    setTitle("");
    loadTasks();
  };

  const updateTaskStatus = async (id, newStatus) => {
    await axios.put(`${API}/api/tasks/${id}`, { status: newStatus });
    loadTasks();
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Удалить задачу?")) return;
    await axios.delete(`${API}/api/tasks/${id}`);
    loadTasks();
  };

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: 16 }}>← Назад к проектам</button>
      <h2>Проект: {project.title}</h2>

      <form onSubmit={createTask} style={{ marginBottom: 24, display: "flex", gap: 8 }}>
        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="Название новой задачи..." 
          style={{ flex: 1, padding: 8 }} 
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: 8 }}>
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">В работе</option>
          <option value="DONE">Готово</option>
        </select>
        <button type="submit" style={{ padding: "8px 16px" }}>Добавить</button>
      </form>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {tasks.map((t) => (
          <li key={t.id} style={{ border: "1px solid #ccc", padding: 16, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{t.title}</strong>
              <div style={{ marginTop: 8 }}>
                <select 
                  value={t.status} 
                  onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                  style={{ padding: 4 }}
                >
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">В работе</option>
                  <option value="DONE">Готово</option>
                </select>
              </div>
            </div>
            <button onClick={() => deleteTask(t.id)} style={{ color: "red" }}>Удалить</button>
          </li>
        ))}
        {tasks.length === 0 && <p>В этом проекте пока нет задач.</p>}
      </ul>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);