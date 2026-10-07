import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

function App() {
  const [apiStatus, setApiStatus] = useState("loading...");
  const [dbStatus, setDbStatus] = useState("loading...");

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/health")
      .then((r) => setApiStatus(r.data.status))
      .catch(() => setApiStatus("error"));

    axios
      .get("http://localhost:5000/api/db-check")
      .then((r) => setDbStatus(r.data.status))
      .catch(() => setDbStatus("error"));
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: 32 }}>
      <h1>🐳 TaskFlow</h1>
      <p>Docker-инфраструктура работает.</p>
      <ul>
        <li>API: <strong>{apiStatus}</strong></li>
        <li>DB: <strong>{dbStatus}</strong></li>
      </ul>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
