import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

function TimeUnit({ label, value, onChange, max = 59 }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");
  const elRef                  = useRef(null);

  const inc = useCallback(() => onChange((value + 1) % (max + 1)),           [value, max, onChange]);
  const dec = useCallback(() => onChange((value - 1 + max + 1) % (max + 1)), [value, max, onChange]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const handler = (e) => { e.preventDefault(); e.deltaY < 0 ? inc() : dec(); };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [inc, dec]);

  const commit = (val) => {
    const n = parseInt(val, 10);
    onChange(isNaN(n) ? value : Math.min(Math.max(n, 0), max));
    setEditing(false);
  };

  return (
    <div className="flex flex-col items-center gap-3 flex-1">
      <span>{label}</span>
      <button onClick={inc} className="p-1">
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
          style={{ cursor: "text", userSelect: "none" }}
          onClick={() => { setDraft(String(value).padStart(2, "0")); setEditing(true); }}
        >
          {String(value).padStart(2, "0")}
        </span>
      )}

      <button onClick={dec} className="p-1">
        <ChevronDown size={28} strokeWidth={1.5} />
      </button>
    </div>
  );
}

// NewTimer overlay

export default function NewTimer({
  initialH = 0,
  initialM = 0,
  initialS = 0,
  onCancel,
  onDiscard,
}) {
  const [hours,   setHours]   = useState(initialH);
  const [minutes, setMinutes] = useState(initialM);
  const [seconds, setSeconds] = useState(initialS);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.3)", zIndex: 50 }}
    >
      {/* Card */}
      <div
        className="flex flex-col rounded-[28px] bg-white mx-[24px] w-full max-w-[360px]"
        style={{ padding: "24px 20px 20px" }}
      >
        {/* Title */}
        <h1 className="text-center mb-2">Break Timer</h1>

        {/* Time Picker */}
        <div className="flex py-4">
          <TimeUnit label="Hours"   value={hours}   onChange={setHours}   max={23} />
          <TimeUnit label="Minutes" value={minutes} onChange={setMinutes} />
          <TimeUnit label="Seconds" value={seconds} onChange={setSeconds} />
        </div>

        {/* Actions */}
        <div className="flex gap-[12px] mt-2">
          <button className="alt"     onClick={onCancel}>
            Cancel
          </button>
          <button className="default" onClick={() => onDiscard(hours, minutes, seconds)}>
            Set
          </button>
        </div>
      </div>
    </div>
  );
}