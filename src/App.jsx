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

  const founderName =
    user?.email === "foundera@hacklab.com"
      ? "Founder A"
      : "Founder B";

  const rival =
    founderName === "Founder A"
      ? "Founder B"
      : "Founder A";

  const color = USER_COLORS[founderName];

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

  async function login() {
    const { data, error } =
      await supabase.auth.signInWithPassword({
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
    }
  }

  function startSession() {
    setActiveSession({
      startTime: Date.now(),
    });
  }

  async function stopSession() {
    if (!sessionNote.trim()) return;

    const duration =
      Date.now() - activeSession.startTime;

    const newSession = {
      user: founderName,
      note: sessionNote,
      duration,
      date: today(),
    };

    const { error } = await supabase
      .from("sessions")
      .insert([newSession]);

    if (!error) {
      fetchSessions();
    }

    setActiveSession(null);
    setElapsed(0);
    setSessionNote("");
  }

  function getStats(u) {
    const mine = sessions.filter(
      (s) => s.user === u
    );

    const total = mine.reduce(
      (a, s) => a + s.duration,
      0
    );

    const todayTotal = mine
      .filter((s) => s.date === today())
      .reduce((a, s) => a + s.duration, 0);

    return {
      total,
      today: todayTotal,
      count: mine.length,
    };
  }

  const statsA = getStats("Founder A");
  const statsB = getStats("Founder B");

  const myStats =
    founderName === "Founder A"
      ? statsA
      : statsB;

  const rivalStats =
    founderName === "Founder A"
      ? statsB
      : statsA;

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
        }}
      >
        <h1>HackLab Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          style={{
            padding: "10px",
            width: "260px",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          style={{
            padding: "10px",
            width: "260px",
          }}
        />

        <button
          onClick={login}
          style={{
            padding: "10px 20px",
            cursor: "pointer",
          }}
        >
          Login
        </button>
      </div>
    );
  }

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
        }}
      >
        <div>
          <h1>HACKLAB</h1>

          <div>
            Logged in as{" "}
            <b style={{ color }}>
              {founderName}
            </b>
          </div>
        </div>

        <button
          onClick={() => setUser(null)}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "#222",
            padding: "1rem",
            borderRadius: "12px",
          }}
        >
          <h2>Your Stats</h2>

          <p>Today: {fmtHours(myStats.today)}</p>

          <p>Total: {fmtHours(myStats.total)}</p>

          <p>Sessions: {myStats.count}</p>
        </div>

        <div
          style={{
            background: "#222",
            padding: "1rem",
            borderRadius: "12px",
          }}
        >
          <h2>{rival} Stats</h2>

          <p>
            Today: {fmtHours(rivalStats.today)}
          </p>

          <p>
            Total: {fmtHours(rivalStats.total)}
          </p>

          <p>
            Sessions: {rivalStats.count}
          </p>
        </div>
      </div>

      <div
        style={{
          background: "#222",
          padding: "1rem",
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
            }}
          >
            Start Session
          </button>
        ) : (
          <>
            <h1>{fmt(elapsed)}</h1>

            <textarea
              placeholder="What did you work on?"
              value={sessionNote}
              onChange={(e) =>
                setSessionNote(e.target.value)
              }
              style={{
                width: "100%",
                height: "120px",
                marginBottom: "1rem",
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
              }}
            >
              Stop & Save
            </button>
          </>
        )}
      </div>

      <div>
        <h2>Recent Sessions</h2>

        {sessions.map((s) => (
          <div
            key={s.id}
            style={{
              background: "#222",
              padding: "1rem",
              borderRadius: "10px",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                color: USER_COLORS[s.user],
                fontWeight: "bold",
              }}
            >
              {USER_AVATARS[s.user]} {s.user}
            </div>

            <div>{s.note}</div>

            <div
              style={{
                marginTop: "0.5rem",
                opacity: 0.7,
              }}
            >
              {s.date} • {fmtHours(s.duration)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}