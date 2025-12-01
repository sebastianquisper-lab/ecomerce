// SupportAiChat.js
// Componente React (chat paso a paso que crea tickets)
// No usa Tailwind. Usa estilos inline.

import React, { useState, useEffect, useRef } from "react";

export default function SupportAiChat({ defaultCreatorEmail = "" }) {
  const BACKEND = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

  const QUESTIONS = [
    { key: "creator_email", question: "¿Cuál es tu email? (para identificar la cuenta)", placeholder: "tu@correo.com", optional: false },
    { key: "subject", question: "¿Cuál es el asunto del problema?", placeholder: "Asunto breve", optional: false },
    { key: "description", question: "Describe brevemente el problema (puntos importantes)", placeholder: "Describe lo que pasa...", optional: false },
  ];

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ creator_email: defaultCreatorEmail });
  const [input, setInput] = useState(defaultCreatorEmail || "");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const chatBoxRef = useRef(null);

  function pushBot(text) {
    setHistory(h => [...h, { who: "bot", text }]);
  }
  function pushUser(text) {
    setHistory(h => [...h, { who: "user", text }]);
  }

  useEffect(() => {
    // iniciar conversación
    setTimeout(() => pushBot(QUESTIONS[0].question), 200);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // Scroll automático al final
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmitAnswer = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const currentQ = QUESTIONS[step];
    const value = input.trim();
    if (!value && !currentQ.optional) {
      setError("Este campo es obligatorio");
      return;
    }
    setError(null);
    pushUser(value || "(vacío)");

    const newAnswers = { ...answers, [currentQ.key]: value };
    setAnswers(newAnswers);
    setInput("");

    const next = step + 1;
    if (next < QUESTIONS.length) {
      setStep(next);
      setTimeout(() => pushBot(QUESTIONS[next].question), 300);
    } else {
      // enviar al backend
      setLoading(true);
      pushBot("Gracias — creando tu ticket...");
      try {
        const payload = {
          creator_email: newAnswers.creator_email,
          subject: newAnswers.subject,
          description: newAnswers.description,
          assignee_email: "rpalacios@gmail.com"
        };

        const headers = { "Content-Type": "application/json" };
        if (typeof window !== "undefined" && window.__SUPPORT_WIDGET_JWT) {
          headers.Authorization = "Bearer " + window.__SUPPORT_WIDGET_JWT;
        }

        const resp = await fetch(`${BACKEND}/api/create_ticket`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          const message = data.error || data.msg || data.message || JSON.stringify(data);
          throw new Error(message || "Error desconocido del servidor");
        }

        setResult(data);
        pushBot("Ticket creado con éxito. ID: " + (data.ticket_id || data.id || "(ver admin)"));
      } catch (err) {
        console.error("Error al crear ticket:", err);
        pushBot("Error al crear el ticket: " + err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRestart = () => {
    setStep(0);
    setAnswers({ creator_email: defaultCreatorEmail });
    setInput(defaultCreatorEmail || "");
    setHistory([]);
    setResult(null);
    setError(null);
    setTimeout(() => pushBot(QUESTIONS[0].question), 150);
  };

  // --- estilos inline ---
  const styles = {
    container: { width: "100%", maxWidth: 360, boxSizing: "border-box", padding: 12 },
    card: { background: "#fff", borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.12)", padding: 12 },
    chatBox: { height: 280, overflowY: "auto", border: "1px solid #eee", borderRadius: 6, padding: 8, background: "#fafafa", marginBottom: 8 },
    botBubble: { background: "#f0f0f0", color: "#111", padding: "8px 10px", borderRadius: 8, display: "inline-block", maxWidth: "85%" },
    userBubble: { background: "#0ea5ff", color: "#fff", padding: "8px 10px", borderRadius: 8, display: "inline-block", maxWidth: "85%" },
    form: { display: "flex", gap: 8 },
    input: { flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd" },
    btn: { padding: "8px 12px", borderRadius: 6, background: "#10b981", color: "#fff", border: "none", cursor: "pointer" },
    smallMuted: { fontSize: 12, color: "#666", marginTop: 6 },
    resultBox: { marginTop: 8, padding: 8, background: "#ecfccb", borderRadius: 6, border: "1px solid #d9f99d" }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Asistente de Soporte (IA)</div>

        <div style={styles.chatBox} id="chatBox" ref={chatBoxRef}>
          {history.length === 0 && <div style={{ color: "#888", fontSize: 13 }}>Iniciando conversación...</div>}
          {history.map((m, i) => (
            <div key={i} style={{ marginBottom: 8, display: "flex", justifyContent: m.who === "bot" ? "flex-start" : "flex-end" }}>
              <div style={m.who === "bot" ? styles.botBubble : styles.userBubble}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {!result && (
          <form onSubmit={handleSubmitAnswer} style={styles.form}>
            <input
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={QUESTIONS[step].placeholder}
              disabled={loading}
            />
            <button type="submit" disabled={loading} style={styles.btn}>
              {step < QUESTIONS.length - 1 ? "Siguiente" : "Enviar"}
            </button>
          </form>
        )}

        {error && <div style={{ color: "#b91c1c", marginTop: 8 }}>{error}</div>}
        {loading && <div style={styles.smallMuted}>Enviando...</div>}

        {result && (
          <div style={styles.resultBox}>
            <div style={{ fontSize: 13 }}>Resultado: <strong>{JSON.stringify(result)}</strong></div>
            <div style={{ marginTop: 8 }}>
              <button onClick={handleRestart} style={{ ...styles.btn, background: "#3b82f6" }}>Crear otro</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
