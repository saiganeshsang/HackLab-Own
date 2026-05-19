import { supabase } from "./supabase";
import { useState, useEffect, useRef } from "react";

const USER_COLORS = {
  "Founder A": "#e85d2f",
  "Founder B": "#2563eb",
};

const USER_AVATARS = {
  "Founder A": "FA",
  "Founder B": "FB",
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0"
  )}:${String(sec).padStart(2, "0")}`;
}

function fmtHours(ms) {
  return (ms / 3600000).toFixed(1) + "h";
}

export default function HackLab() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [sessionNote, setSessionNote] = useState("");
  const timerRef = useRef(null);
  const subscriptionRef = useRef(null);

  const founderName =
    user?.email === "foundera@hacklab.com"
      ? "Founder A"
      : user?.email === "founderb@hacklab.com"
      ? "Founder B"
      : null;

  const rival =
    founderName === "Founder A"
      ? "Founder B"
      : "Founder A";

  const color = USER_COLORS[founderName] || "#ffffff";

  useEffect(() => {
    fetchSessions();

    const subscription = supabase
      .channel('sessions-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sessions' }, 
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
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

  async function login() {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    if (email !== "foundera@hacklab.com" && email !== "founderb@hacklab.com") {
      alert("Access denied. Only Founder A and Founder B can log in.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setUser(data.user);
  }

  async function fetchSessions() {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("id", { ascending: false });

    if (!error && data) {
      setSessions(data);
    } else if (error) {
      console.error("Error fetching sessions:", error);
    }
  }

  function startSession() {
    setActiveSession({
      startTime: Date.now(),
    });
  }

  async function stopSession() {
    if (!sessionNote.trim()) {
      alert("Please add a note about your work.");
      return;
    }

    const duration = Date.now() - activeSession.startTime;

    const newSession = {
      username: founderName,  // Changed from 'user' to 'username'
      note: sessionNote,
      duration,
      date: today(),
    };

    const { error } = await supabase.from("sessions").insert([newSession]);

    if (error) {
      alert("Error saving session: " + error.message);
    } else {
      await fetchSessions();
    }

    setActiveSession(null);
    setElapsed(0);
    setSessionNote("");
  }

  function getStats(u) {
    const mine = sessions.filter((s) => s.username === u);  // Changed from s.user to s.username
    const total = mine.reduce((a, s) => a + s.duration, 0);
    const todayTotal = mine
      .filter((s) => s.date === today())
      .reduce((a, s) => a + s.duration, 0);

    return {
      total,
      today: todayTotal,
      count: mine.length,
    };
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: "1rem",
          background: "#111",
          color: "white",
        }}
      >
        <h1>HackLab Login</h1>
        <p style={{ marginBottom: "1rem", color: "#aaa" }}>
          Only Founder A and Founder B can access
        </p>

        <input
          type="email"
          placeholder="Email (foundera@hacklab.com or founderb@hacklab.com)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: "10px",
            width: "300px",
            borderRadius: "6px",
            border: "1px solid #333",
            background: "#222",
            color: "white",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: "10px",
            width: "300px",
            borderRadius: "6px",
            border: "1px solid #333",
            background: "#222",
            color: "white",
          }}
        />

        <button
          onClick={login}
          style={{
            padding: "10px 20px",
            cursor: "pointer",
            background: "#3b82f6",
            border: "none",
            color: "white",
            borderRadius: "6px",
            fontWeight: "bold",
          }}
        >
          Login
        </button>
      </div>
    );
  }

  if (!founderName) {
    return (
      <div style={{ padding: "2rem", color: "white", background: "#111", minHeight: "100vh" }}>
        <h2>Unauthorized Access</h2>
        <p>Your email is not recognized as a founder.</p>
        <button onClick={() => setUser(null)}>Go Back</button>
      </div>
    );
  }

  const statsA = getStats("Founder A");
  const statsB = getStats("Founder B");
  const myStats = founderName === "Founder A" ? statsA : statsB;
  const rivalStats = founderName === "Founder A" ? statsB : statsA;

  return (
    <div
      style={{
        padding: "2rem",
        minHeight: "100vh",
        background: "#111",
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1>⚡ HACKLAB</h1>
          <div>
            Logged in as{" "}
            <b style={{ color }}>{founderName}</b>
          </div>
        </div>

        <button
          onClick={() => setUser(null)}
          style={{
            padding: "8px 16px",
            background: "#333",
            border: "none",
            color: "white",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "#222",
            padding: "1.5rem",
            borderRadius: "12px",
            borderLeft: `4px solid ${color}`,
          }}
        >
          <h3 style={{ marginTop: 0, color }}>📊 Your Stats</h3>
          <p>🔥 Today: {fmtHours(myStats.today)}</p>
          <p>📈 Total: {fmtHours(myStats.total)}</p>
          <p>📋 Sessions: {myStats.count}</p>
        </div>

        <div
          style={{
            background: "#222",
            padding: "1.5rem",
            borderRadius: "12px",
            borderLeft: `4px solid ${USER_COLORS[rival]}`,
          }}
        >
          <h3 style={{ marginTop: 0, color: USER_COLORS[rival] }}>
            🆚 {rival} Stats
          </h3>
          <p>🔥 Today: {fmtHours(rivalStats.today)}</p>
          <p>📈 Total: {fmtHours(rivalStats.total)}</p>
          <p>📋 Sessions: {rivalStats.count}</p>
        </div>
      </div>

      <div
        style={{
          background: "#222",
          padding: "1.5rem",
          borderRadius: "12px",
          marginBottom: "2rem",
        }}
      >
        {!activeSession ? (
          <button
            onClick={startSession}
            style={{
              padding: "12px 24px",
              background: color,
              border: "none",
              color: "white",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ▶ Start Session
          </button>
        ) : (
          <>
            <h1 style={{ fontFamily: "monospace", fontSize: "3rem", margin: "0 0 1rem 0" }}>
              {fmt(elapsed)}
            </h1>

            <textarea
              placeholder="What did you work on? (required)"
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              style={{
                width: "100%",
                height: "100px",
                marginBottom: "1rem",
                padding: "8px",
                borderRadius: "8px",
                background: "#333",
                color: "white",
                border: "1px solid #444",
              }}
            />

            <button
              onClick={stopSession}
              style={{
                padding: "12px 24px",
                background: "#ef4444",
                border: "none",
                color: "white",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ⏹ Stop & Save
            </button>
          </>
        )}
      </div>

      <div>
        <h2>📜 Recent Sessions</h2>
        {sessions.length === 0 ? (
          <p style={{ color: "#aaa" }}>No sessions recorded yet. Start your first session!</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              style={{
                background: "#222",
                padding: "1rem",
                borderRadius: "10px",
                marginBottom: "1rem",
                borderLeft: `4px solid ${USER_COLORS[s.username]}`,  // Changed from s.user to s.username
              }}
            >
              <div
                style={{
                  color: USER_COLORS[s.username],  // Changed from s.user to s.username
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>{USER_AVATARS[s.username]}</span> {s.username}  // Changed from s.user to s.username
              </div>

              <div style={{ margin: "8px 0" }}>{s.note}</div>

              <div
                style={{
                  marginTop: "0.5rem",
                  opacity: 0.7,
                  fontSize: "0.85rem",
                }}
              >
                📅 {s.date} • ⏱ {fmtHours(s.duration)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}