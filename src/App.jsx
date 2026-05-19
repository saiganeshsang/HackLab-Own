import { supabase } from './supabase'
import { useState, useEffect, useRef } from "react";

const USERS = ["Founder A", "Founder B"];
const USER_COLORS = { "Founder A": "#e85d2f", "Founder B": "#2563eb" };
const USER_AVATARS = { "Founder A": "FA", "Founder B": "FB" };

const STORAGE_KEYS = {
  sessions: "hacklab_sessions",
  todos: "hacklab_todos",
  chat: "hacklab_chat",
  schedule: "hacklab_schedule",
  activeSession: "hacklab_active",
};

const TAGS = ["AI/ML", "Frontend", "Backend", "DevOps", "System Design", "Algorithms", "APIs", "Security", "Product", "Other"];

function getStorage(key) {
  try {
    const r = window.storage ? null : null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function setStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}
function fmtHours(ms) {
  return (ms / 3600000).toFixed(1) + "h";
}
function today() { return new Date().toISOString().split("T")[0]; }
function monthKey(d) { return d.slice(0,7); }

export default function HackLab() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [sessions, setSessions] = useState([]);
  const [todos, setTodos] = useState([]);
  const [chat, setChat] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [sessionNote, setSessionNote] = useState("");
  const [sessionTags, setSessionTags] = useState([]);
  const [sessionProject, setSessionProject] = useState("");
  const [chatMsg, setChatMsg] = useState("");
  const [todoText, setTodoText] = useState("");
  const [calDate, setCalDate] = useState(today().slice(0,7));
  const [schedText, setSchedText] = useState("");
  const [schedDate, setSchedDate] = useState(today());
  const [showSessionForm, setShowSessionForm] = useState(false);
  const chatRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
  fetchSessions();
 }, []);

  useEffect(() => {
    if (activeSession) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - activeSession.startTime);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [activeSession]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat, tab]);

  function save(key, data) {
    setStorage(key, data);
  }
   async function login() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }

  if (data.user) {
    setUser(data.user);
  }
  }
  const founderName =
  user?.email === "foundera@hacklab.com"
    ? "Founder A"
    : "Founder B";

  async function fetchSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('id', { ascending: false });

  if (!error && data) {
    const fixedData = data.map(item => ({
  ...item,
  user: item.username
  }));

setSessions(fixedData);
  }
  }

  function startSession() {
    if (!user) return;
    const s = {
  user: founderName,
  startTime: Date.now(),
  id: Date.now()
};
    setActiveSession(s);
    setElapsed(0);
    save(STORAGE_KEYS.activeSession, s);
  }

  async function stopSession() {
  if (!activeSession || !sessionNote.trim()) return;

  const duration = Date.now() - activeSession.startTime;

  const newSession = {
    user: founderName,
    duration,
    note: sessionNote.trim(),
    tags: sessionTags,
    project: sessionProject.trim(),
    date: today(),
  };

  const { error } = await supabase
    .from('sessions')
    .insert([newSession]);

  if (!error) {
    fetchSessions();
  }

  setActiveSession(null);
  setSessionNote("");
  setSessionTags([]);
  setSessionProject("");
  setShowSessionForm(false);
  setElapsed(0);
  }

  function addTodo() {
    if (!todoText.trim()) return;
    const t = { id: Date.now(), text: todoText.trim(), user, done: false, date: today() };
    const updated = [t, ...todos];
    setTodos(updated);
    save(STORAGE_KEYS.todos, updated);
    setTodoText("");
  }

  function toggleTodo(id) {
    const updated = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTodos(updated);
    save(STORAGE_KEYS.todos, updated);
  }

  function deleteTodo(id) {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    save(STORAGE_KEYS.todos, updated);
  }

  function sendChat() {
    if (!chatMsg.trim() || !user) return;
    const m = { id: Date.now(), user, text: chatMsg.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const updated = [...chat, m];
    setChat(updated);
    save(STORAGE_KEYS.chat, updated);
    setChatMsg("");
  }

  function addSchedule() {
    if (!schedText.trim() || !user) return;
    const s = { id: Date.now(), user, text: schedText.trim(), date: schedDate };
    const updated = [...schedule, s];
    setSchedule(updated);
    save(STORAGE_KEYS.schedule, updated);
    setSchedText("");
  }

  function deleteSchedule(id) {
    const updated = schedule.filter(s => s.id !== id);
    setSchedule(updated);
    save(STORAGE_KEYS.schedule, updated);
  }

  // Stats
  function getStats(u) {
    const mine = sessions.filter(s => s.user === u);
    const totalMs = mine.reduce((a, s) => a + s.duration, 0);
    const todaySess = mine.filter(s => s.date === today());
    const todayMs = todaySess.reduce((a, s) => a + s.duration, 0);
    const streak = calcStreak(mine);
    const xp = Math.floor(totalMs / 60000) * 10 + mine.length * 50;
    return { total: totalMs, today: todayMs, count: mine.length, streak, xp };
  }

  function calcStreak(sessions) {
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    if (!dates.length) return 0;
    let streak = 0;
    let cur = new Date();
    for (const d of dates) {
      const diff = Math.floor((cur - new Date(d)) / 86400000);
      if (diff <= 1) { streak++; cur = new Date(d); }
      else break;
    }
    return streak;
  }

  function getDaysInMonth(ym) {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }
  function getFirstDay(ym) {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).getDay();
  }

  
    if (!user) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
      gap: "1rem"
    }}>
      <h1>HackLab Login</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          padding: "10px",
          width: "250px"
        }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          padding: "10px",
          width: "250px"
        }}
      />

      <button
        onClick={login}
        style={{
          padding: "10px 20px",
          cursor: "pointer"
        }}
      >
        Login
      </button>
    </div>
  );
}

  const statsA = getStats("Founder A");
const statsB = getStats("Founder B");

const myStats =
  founderName === "Founder A"
    ? statsA
    : statsB;

const theirStats =
  founderName === "Founder A"
    ? statsB
    : statsA;

const rival =
  founderName === "Founder A"
    ? "Founder B"
    : "Founder A";

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: "ti-dashboard" },
    { id: "log", label: "Sessions", icon: "ti-clock" },
    { id: "todos", label: "To-Do", icon: "ti-check" },
    { id: "chat", label: "Chat", icon: "ti-message" },
    { id: "calendar", label: "Calendar", icon: "ti-calendar" },
  ];

  const color = USER_COLORS[founderName];
  const rivalColor = USER_COLORS[rival];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "0.75rem 1.5rem", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>HACKLAB</span>
          {activeSession && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: "0.5px solid #fca5a5", borderRadius: 8, padding: "4px 10px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }}></span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: "#b91c1c" }}>{fmt(elapsed)}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{USER_AVATARS[founderName]}</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
  {founderName}
</span>
          <button onClick={() => setUser(null)} style={{ fontSize: 12, color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer" }}>Switch</button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", padding: "0 1.5rem", gap: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 16px", background: "none", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
            color: tab === t.id ? color : "var(--color-text-secondary)",
            borderBottom: tab === t.id ? `2px solid ${color}` : "2px solid transparent",
            display: "flex", alignItems: "center", gap: 6
          }}>
            <i className={`ti ${t.icon}`} aria-hidden="true" style={{ fontSize: 15 }}></i>
            {t.label}
            {t.id === "chat" && chat.length > 0 && <span style={{ background: color, color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 6px", fontWeight: 700 }}>{chat.filter(c => c.user !== user).length > 0 ? "•" : ""}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "1.5rem", maxWidth: 900, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            {/* Timer Controls */}
            <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem", border: "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8, fontWeight: 500 }}>Today's Session</div>
              {!activeSession ? (
                <button onClick={startSession} style={{
                  padding: "10px 24px", borderRadius: 8, background: color, color: "#fff",
                  border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", letterSpacing: "0.03em"
                }}>⏱ Start Session</button>
              ) : (
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 40, fontWeight: 800, letterSpacing: "0.05em", color: color, marginBottom: 16 }}>{fmt(elapsed)}</div>
                  {!showSessionForm ? (
                    <button onClick={() => setShowSessionForm(true)} style={{ padding: "10px 24px", borderRadius: 8, background: "#ef4444", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>Stop & Log</button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 500 }}>
                      <textarea value={sessionNote} onChange={e => setSessionNote(e.target.value)} placeholder="What did you learn / build? Be specific." rows={3} style={{ padding: 10, borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
                      <input value={sessionProject} onChange={e => setSessionProject(e.target.value)} placeholder="Project link / repo (optional)" style={{ padding: 9, borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }} />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {TAGS.map(tag => (
                          <button key={tag} onClick={() => setSessionTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])} style={{
                            padding: "4px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                            background: sessionTags.includes(tag) ? color : "transparent",
                            color: sessionTags.includes(tag) ? "#fff" : "var(--color-text-secondary)",
                            border: `0.5px solid ${sessionTags.includes(tag) ? color : "var(--color-border-tertiary)"}`
                          }}>{tag}</button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={stopSession} disabled={!sessionNote.trim()} style={{ padding: "9px 20px", borderRadius: 8, background: sessionNote.trim() ? color : "var(--color-background-secondary)", color: sessionNote.trim() ? "#fff" : "var(--color-text-secondary)", border: "none", fontWeight: 700, cursor: sessionNote.trim() ? "pointer" : "default", fontSize: 13 }}>Save Session</button>
                        <button onClick={() => setShowSessionForm(false)} style={{ padding: "9px 16px", borderRadius: 8, background: "none", border: "0.5px solid var(--color-border-tertiary)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rivalry cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
              {[{ u: user, s: myStats, label: "You", c: color }, { u: rival, s: theirStats, label: "Rival", c: rivalColor }].map(({ u, s, label, c }) => (
                <div key={u} style={{ background: "var(--color-background-primary)", border: `0.5px solid var(--color-border-tertiary)`, borderRadius: 12, padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{USER_AVATARS[u]}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{u}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Today", val: fmtHours(s.today) },
                      { label: "Total", val: fmtHours(s.total) },
                      { label: "Streak", val: s.streak + "d 🔥" },
                      { label: "XP", val: s.xp.toLocaleString() },
                    ].map(({ label: l, val }) => (
                      <div key={l} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* XP Bar */}
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8, fontWeight: 500 }}>XP Race</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: USER_COLORS["Founder A"], fontWeight: 600, width: 80, textAlign: "right" }}>FA {statsA.xp.toLocaleString()}</span>
                <div style={{ flex: 1, height: 12, background: "var(--color-background-secondary)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(100, (statsA.xp / (Math.max(statsA.xp, statsB.xp) || 1)) * 100)}%`, background: USER_COLORS["Founder A"], borderRadius: 6 }}></div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: USER_COLORS["Founder B"], fontWeight: 600, width: 80, textAlign: "right" }}>FB {statsB.xp.toLocaleString()}</span>
                <div style={{ flex: 1, height: 12, background: "var(--color-background-secondary)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min(100, (statsB.xp / (Math.max(statsA.xp, statsB.xp) || 1)) * 100)}%`, background: USER_COLORS["Founder B"], borderRadius: 6 }}></div>
                </div>
              </div>
            </div>

            {/* Recent sessions feed */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--color-text-secondary)" }}>Recent Sessions</div>
              {sessions.slice(0, 6).map(s => (
                <div key={s.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: USER_COLORS[s.user], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0, marginTop: 2 }}>{USER_AVATARS[s.user]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: USER_COLORS[s.user] }}>{s.user}</span>
                      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{s.date} · {fmtHours(s.duration)}</span>
                    </div>
                    <div style={{ fontSize: 13 }}>{s.note}</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                      {s.tags?.map(tag => <span key={tag} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>{tag}</span>)}
                      {s.project && <a href={s.project} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: USER_COLORS[s.user], textDecoration: "none" }}>↗ Project</a>}
                    </div>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && <div style={{ color: "var(--color-text-secondary)", fontSize: 13, padding: "1rem 0" }}>No sessions yet. Start your first one above!</div>}
            </div>
          </div>
        )}

        {/* SESSIONS LOG */}
        {tab === "log" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--color-text-secondary)" }}>All Sessions — {sessions.length} total</div>
            {sessions.map(s => (
              <div key={s.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: USER_COLORS[s.user], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{USER_AVATARS[s.user]}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: USER_COLORS[s.user] }}>{s.user}</span>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{s.date}</span>
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: USER_COLORS[s.user] }}>{fmtHours(s.duration)}</span>
                </div>
                <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.6 }}>{s.note}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {s.tags?.map(tag => <span key={tag} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>{tag}</span>)}
                  {s.project && <a href={s.project} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: USER_COLORS[s.user], textDecoration: "none" }}>↗ Project link</a>}
                </div>
              </div>
            ))}
            {sessions.length === 0 && <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>No sessions logged yet.</div>}
          </div>
        )}

        {/* TODOS */}
        {tab === "todos" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
              <input value={todoText} onChange={e => setTodoText(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()} placeholder="Add a task..." style={{ flex: 1, padding: "9px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }} />
              <button onClick={addTodo} style={{ padding: "9px 18px", borderRadius: 8, background: color, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Add</button>
            </div>
            {["Founder A", "Founder B"].map(u => {
              const myTodos = todos.filter(t => t.user === u);
              return (
                <div key={u} style={{ marginBottom: "2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: USER_COLORS[u], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{USER_AVATARS[u]}</div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: USER_COLORS[u] }}>{u}'s Tasks</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{myTodos.filter(t => !t.done).length} pending</span>
                  </div>
                  {myTodos.length === 0 && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", padding: "0.5rem 0" }}>No tasks yet</div>}
                  {myTodos.map(t => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "var(--color-background-secondary)", marginBottom: 6 }}>
                      <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)} style={{ cursor: "pointer", accentColor: USER_COLORS[u] }} />
                      <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}>{t.text}</span>
                      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{t.date}</span>
                      {t.user === user && <button onClick={() => deleteTodo(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16, lineHeight: 1 }}>×</button>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* CHAT */}
        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", maxHeight: 600 }}>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }} ref={chatRef}>
              {chat.length === 0 && <div style={{ color: "var(--color-text-secondary)", fontSize: 13, textAlign: "center", marginTop: "4rem" }}>No messages yet. Start the conversation!</div>}
              {chat.map(m => {
                const mine = m.user === user;
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                    {!mine && <div style={{ width: 24, height: 24, borderRadius: "50%", background: USER_COLORS[m.user], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{USER_AVATARS[m.user]}</div>}
                    <div style={{ maxWidth: "70%" }}>
                      <div style={{
                        padding: "8px 14px", borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: mine ? color : "var(--color-background-secondary)",
                        color: mine ? "#fff" : "var(--color-text-primary)",
                        fontSize: 13, lineHeight: 1.5
                      }}>{m.text}</div>
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 3, textAlign: mine ? "right" : "left" }}>{m.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Message..." style={{ flex: 1, padding: "9px 14px", borderRadius: 20, border: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }} />
              <button onClick={sendChat} style={{ padding: "9px 18px", borderRadius: 20, background: color, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Send</button>
            </div>
          </div>
        )}

        {/* CALENDAR */}
        {tab === "calendar" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
              <button onClick={() => {
                const [y, m] = calDate.split("-").map(Number);
                const d = new Date(y, m - 2, 1);
                setCalDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
              }} style={{ background: "none", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 16 }}>‹</button>
              <span style={{ fontWeight: 700, fontSize: 16, minWidth: 140, textAlign: "center" }}>{new Date(calDate + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              <button onClick={() => {
                const [y, m] = calDate.split("-").map(Number);
                const d = new Date(y, m, 1);
                setCalDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
              }} style={{ background: "none", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 16 }}>›</button>
            </div>

            {/* Calendar grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: "1.5rem" }}>
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", padding: "4px 0" }}>{d}</div>
              ))}
              {Array(getFirstDay(calDate)).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {Array(getDaysInMonth(calDate)).fill(null).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${calDate}-${String(dayNum).padStart(2, "0")}`;
                const daySessions = sessions.filter(s => s.date === dateStr);
                const daySchedule = schedule.filter(s => s.date === dateStr);
                const isToday = dateStr === today();
                return (
                  <div key={dayNum} style={{
                    border: isToday ? `1.5px solid ${color}` : "0.5px solid var(--color-border-tertiary)",
                    borderRadius: 8, padding: "6px 8px", minHeight: 60,
                    background: isToday ? "var(--color-background-secondary)" : "var(--color-background-primary)"
                  }}>
                    <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? color : "var(--color-text-primary)", marginBottom: 3 }}>{dayNum}</div>
                    {daySessions.slice(0, 2).map(s => (
                      <div key={s.id} style={{ width: 6, height: 6, borderRadius: "50%", background: USER_COLORS[s.user], display: "inline-block", marginRight: 2 }}></div>
                    ))}
                    {daySchedule.slice(0, 1).map(s => (
                      <div key={s.id} style={{ fontSize: 9, background: USER_COLORS[s.user], color: "#fff", borderRadius: 3, padding: "1px 4px", marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{s.text}</div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Add schedule */}
            <div style={{ background: "var(--color-background-secondary)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Schedule Something</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }} />
                <input value={schedText} onChange={e => setSchedText(e.target.value)} onKeyDown={e => e.key === "Enter" && addSchedule()} placeholder="What are you planning?" style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", fontSize: 13 }} />
                <button onClick={addSchedule} style={{ padding: "8px 16px", borderRadius: 8, background: color, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Add</button>
              </div>
            </div>

            {/* Upcoming schedule */}
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Upcoming</div>
            {schedule.filter(s => s.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8).map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: USER_COLORS[s.user], flexShrink: 0 }}></div>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", minWidth: 80 }}>{s.date}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{s.text}</span>
                <span style={{ fontSize: 11, color: USER_COLORS[s.user], fontWeight: 600 }}>{s.user.replace("Founder ", "F")}</span>
                {s.user === user && <button onClick={() => deleteSchedule(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16 }}>×</button>}
              </div>
            ))}
            {schedule.filter(s => s.date >= today()).length === 0 && <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Nothing scheduled yet.</div>}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
        input, textarea, select { background: var(--color-background-primary); color: var(--color-text-primary); }
      `}</style>
    </div>
  );
}
