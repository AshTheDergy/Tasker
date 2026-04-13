// Still uses the old API system, and hasnt been reworked yet
// Will be reworked in the future

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import NewTimer from "../components/Newtimer";
import { ChevronUp, ChevronDown } from "lucide-react";

const API = "http://localhost:5173/api";

function secToFmt(total) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
function fmt(h, m, s) {
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
function fromSec(t) {
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60];
}

function TimeUnit({ label, value, onChange, max = 59, disabled = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const elRef = useRef(null);

  const inc = useCallback(() => onChange((value + 1) % (max + 1)), [value, max, onChange]);
  const dec = useCallback(() => onChange((value - 1 + max + 1) % (max + 1)), [value, max, onChange]);

  useEffect(() => {
    const el = elRef.current;
    if (!el || disabled) return;
    const handler = (e) => { e.preventDefault(); e.deltaY < 0 ? inc() : dec(); };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [inc, dec, disabled]);

  const commit = (val) => {
    const n = parseInt(val, 10);
    onChange(isNaN(n) ? value : Math.min(Math.max(n, 0), max));
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center gap-3 flex-1">
      <span>{label}</span>
      <button onClick={inc} className="p-1" style={{ visibility: disabled ? "hidden" : "visible" }}>
        <ChevronUp size={28} strokeWidth={1.5} />
      </button>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => e.key === "Enter" && commit(draft)}
          style={{
            fontFamily: "kronaone",
            fontSize: "26px",
            textAlign: "center",
            width: "3ch",
            background: "transparent",
            border: "none",
            outline: "none",
          }}
        />
      ) : (
        <span
          ref={elRef}
          className="xl"
          style={{ cursor: disabled ? "default" : "text", userSelect: "none" }}
          onClick={() => {
            if (disabled) return;
            setDraft(String(value).padStart(2, "0"));
            setEditing(true);
          }}
        >
          {String(value).padStart(2, "0")}
        </span>
      )}
      <button onClick={dec} className="p-1" style={{ visibility: disabled ? "hidden" : "visible" }}>
        <ChevronDown size={28} strokeWidth={1.5} />
      </button>
    </div>
  );
}

function PresetCard({ preset, selected, onClick, onLongPress }) {
  const pressTimer = useRef(null);
  const didLongPress = useRef(false);

  const startPress = () => {
    didLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
    }, 600);
  };

  const endPress = () => {
    clearTimeout(pressTimer.current);
    if (!didLongPress.current) onClick();
  };

  const cancel = () => clearTimeout(pressTimer.current);

  const workLabel = preset.name || secToFmt(preset.focus_time);
  const brkLabel  = secToFmt(preset.break_time);

  return (
    <button
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={cancel}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchMove={cancel}
      className="inline-flex flex-col items-center justify-center rounded-[20px] px-5 py-4 flex-shrink-0"
      style={{
        background: "white",
        border: selected ? "2px solid var(--color-black)" : "2px solid transparent",
        minWidth: "120px",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <span className="nbold" style={{ fontSize: "14px" }}>{workLabel}</span>
      <small style={{ color: "var(--color-dark-gray)" }}>{brkLabel}</small>
      {preset.break_loops > 1 && (
        <small style={{ color: "var(--color-dark-gray)" }}>×{preset.break_loops}</small>
      )}
    </button>
  );
}


export default function Timer() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [hours,   setHours]   = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);


  const [breakH, setBreakH] = useState(0);
  const [breakM, setBreakM] = useState(5);
  const [breakS, setBreakS] = useState(0);


  const [repeatCycle, setRepeatCycle] = useState(0);


  const [phase,      setPhase]      = useState("idle");
  const [remaining,  setRemaining]  = useState(0);
  const [cyclesLeft, setCyclesLeft] = useState(1);

  const phaseRef      = useRef("idle");
  const remainingRef  = useRef(0);
  const cyclesLeftRef = useRef(1);
  const workTotalRef  = useRef(0);
  const breakTotalRef = useRef(0);
  const intervalRef   = useRef(null);

  useEffect(() => { phaseRef.current      = phase;      }, [phase]);
  useEffect(() => { remainingRef.current  = remaining;  }, [remaining]);
  useEffect(() => { cyclesLeftRef.current = cyclesLeft; }, [cyclesLeft]);

  const isRunning = phase === "work" || phase === "break";

  // ── Tick ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) { clearInterval(intervalRef.current); return; }

    intervalRef.current = setInterval(() => {
      if (phaseRef.current !== "work" && phaseRef.current !== "break") {
        clearInterval(intervalRef.current); return;
      }
      const next = remainingRef.current - 1;
      if (next > 0) { remainingRef.current = next; setRemaining(next); return; }

      const ph = phaseRef.current;
      const cl = cyclesLeftRef.current;

      if (ph === "work") {
        const bt = breakTotalRef.current;
        if (bt > 0) {
          phaseRef.current = "break"; remainingRef.current = bt;
          setPhase("break"); setRemaining(bt);
        } else if (cl > 1) {
          phaseRef.current = "work"; remainingRef.current = workTotalRef.current;
          cyclesLeftRef.current = cl - 1; setRemaining(workTotalRef.current); setCyclesLeft(cl - 1);
        } else {
          phaseRef.current = "done"; remainingRef.current = 0;
          setPhase("done"); setRemaining(0); clearInterval(intervalRef.current);
        }
      } else if (ph === "break") {
        if (cl > 1) {
          phaseRef.current = "work"; remainingRef.current = workTotalRef.current;
          cyclesLeftRef.current = cl - 1;
          setPhase("work"); setRemaining(workTotalRef.current); setCyclesLeft(cl - 1);
        } else {
          phaseRef.current = "done"; remainingRef.current = 0;
          setPhase("done"); setRemaining(0); clearInterval(intervalRef.current);
        }
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning]);


  const handleStart = () => {
    const wt = hours * 3600 + minutes * 60 + seconds;
    if (wt === 0) return;
    const bt    = breakH * 3600 + breakM * 60 + breakS;
    const cl    = repeatCycle + 1;
    workTotalRef.current  = wt;
    breakTotalRef.current = bt;
    phaseRef.current      = "work";
    remainingRef.current  = wt;
    cyclesLeftRef.current = cl;
    setPhase("work"); setRemaining(wt); setCyclesLeft(cl);
  };

  const handleStop = () => {
    clearInterval(intervalRef.current);
    phaseRef.current = "idle"; remainingRef.current = 0;
    setPhase("idle"); setRemaining(0);
  };


  const [presets,        setPresets]        = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);

  const userId = localStorage.getItem("userId");

  const fetchPresets = useCallback(async () => {
    if (!userId) return;
    try {
      const res  = await fetch(`${API}/users/${userId}/timers`);
      const data = await res.json();
      setPresets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch presets:", err);
    }
  }, [userId]);


  useEffect(() => { fetchPresets(); }, [fetchPresets, location.key]);

  const applyPreset = (preset, index) => {
    if (isRunning) return;
    setSelectedPreset(index);
    const [wh, wm, ws] = fromSec(preset.focus_time);
    const [bh, bm, bs] = fromSec(preset.break_time);
    setHours(wh);  setMinutes(wm);  setSeconds(ws);
    setBreakH(bh); setBreakM(bm);  setBreakS(bs);
    setRepeatCycle(Math.max(0, preset.break_loops - 1));
  };


  const goAddPreset = () => {
    navigate("/editpreset", { state: { mode: "add" } });
  };

  const goEditPreset = (preset) => {
    navigate("/editpreset", { state: { mode: "edit", preset } });
  };


  const [showBreakModal, setShowBreakModal] = useState(false);


  const [dH, dM, dS]           = phase === "work"  ? fromSec(remaining) : [hours,  minutes, seconds];
  const [bDispH, bDispM, bDispS] = phase === "break" ? fromSec(remaining) : [breakH, breakM,  breakS];

  const cyclesTotal  = repeatCycle + 1;
  const currentCycle = cyclesTotal - cyclesLeft + 1;

  return (
    <div className="h-full bg-bg flex flex-col" style={{ position: "relative" }}>
      <Header />

      {/* Phase badge */}
      <div className="flex justify-center pt-2" style={{ minHeight: "28px" }}>
        {isRunning && (
          <span className="tag">
            {phase === "work" ? "Work" : "Break"}
            {cyclesTotal > 1 && ` · ${currentCycle} / ${cyclesTotal}`}
          </span>
        )}
        {phase === "done" && <span className="tag">Done 🎉</span>}
      </div>

      {/* Main Time Picker */}
      <div className="flex px-[24px] pt-4 pb-2">
        <TimeUnit label="Hours"   value={dH} onChange={setHours}   max={23} disabled={isRunning} />
        <TimeUnit label="Minutes" value={dM} onChange={setMinutes}           disabled={isRunning} />
        <TimeUnit label="Seconds" value={dS} onChange={setSeconds}           disabled={isRunning} />
      </div>

      {/* Scrollable section */}
      <div className="flex flex-col px-[16px] gap-[12px] overflow-y-auto pb-28">
        <span className="nbold px-[4px]">Advanced</span>

        {/* Break Timer */}
        <div className="gap-[8px] bg-white rounded-[20px] p-[16px] flex items-center justify-between">
          <span className="nbold">Break Timer</span>
          <button
            onClick={() => setShowBreakModal(true)}
            style={{
              background: "var(--color-quaternary)",
              borderRadius: "10px",
              padding: "6px 14px",
              fontFamily: "inter",
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--color-black)",
              letterSpacing: "0.5px",
            }}
          >
            {fmt(bDispH, bDispM, bDispS)}
          </button>
        </div>

        {/* Times To Repeat Cycle */}
        <div className="gap-[8px] bg-white rounded-[20px] p-[16px] flex items-center justify-between">
          <span className="nbold">Times To Repeat Cycle</span>
          <div style={{ background: "var(--color-quaternary)", borderRadius: "10px", padding: "6px 14px" }}>
            <select
              value={repeatCycle}
              onChange={(e) => setRepeatCycle(Number(e.target.value))}
              disabled={isRunning}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "inter",
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--color-black)",
                cursor: isRunning ? "default" : "pointer",
              }}
            >
              {[0, 1, 2, 3, 4, 5, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Start / Stop */}
        <div className="flex justify-center mt-2">
          {isRunning ? (
            <button className="alt" onClick={handleStop}>Stop</button>
          ) : (
            <button className="default" onClick={handleStart}>
              {phase === "done" ? "Restart" : "Start"}
            </button>
          )}
        </div>

        {/* Add Preset */}
        <div className="flex justify-end">
          <button className="buttonM" onClick={goAddPreset}>Add Preset</button>
        </div>

        {/* Preset Cards */}
        {presets.length > 0 && (
          <div className="scroll-container gap-3 pb-1">
            {presets.map((p, i) => (
              <PresetCard
                key={p.id}
                preset={p}
                selected={selectedPreset === i}
                onClick={() => applyPreset(p, i)}
                onLongPress={() => goEditPreset(p)}
              />
            ))}
          </div>
        )}

        {presets.length === 0 && (
          <p style={{ color: "var(--color-dark-gray)", textAlign: "center", fontSize: "13px" }}>
            No presets yet — tap "Add Preset" to create one.
          </p>
        )}
      </div>

      {/* Break Timer Modal */}
      {showBreakModal && (
        <NewTimer
          initialH={breakH}
          initialM={breakM}
          initialS={breakS}
          onCancel={() => setShowBreakModal(false)}
          onDiscard={(h, m, s) => {
            setBreakH(h); setBreakM(m); setBreakS(s);
            setShowBreakModal(false);
          }}
        />
      )}
    </div>
  );
}