// Still uses the old API system, and hasnt been reworked yet
// Will be reworked in the future

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NewTimer from "../components/Newtimer";

const API = "http://localhost:5173/api";

function fmt(h, m, s) {
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}
function fromSec(total = 0) {
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60];
}
function toSec(h, m, s) {
  return h * 3600 + m * 60 + s;
}

function Row({ children }) {
  return (
    <div className="gap-[8px] bg-white rounded-[20px] p-[16px] flex items-center justify-between">
      {children}
    </div>
  );
}

// Main Page
export default function EditPreset() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Determine mode from navigation state
  const { mode = "add", preset = null } = location.state || {};
  const isEdit = mode === "edit";

  // Seed values from existing preset (edit) or defaults (add)
  const [initFocusH, initFocusM, initFocusS] = fromSec(preset?.focus_time  ?? 0);
  const [initBreakH, initBreakM, initBreakS] = fromSec(preset?.break_time  ?? 0);
  const initLoops = preset ? Math.max(0, (preset.break_loops ?? 1) - 1) : 0;

  // Focus timer state
  const [focusH, setFocusH] = useState(initFocusH);
  const [focusM, setFocusM] = useState(initFocusM);
  const [focusS, setFocusS] = useState(initFocusS);

  // Break timer state
  const [breakH, setBreakH] = useState(initBreakH);
  const [breakM, setBreakM] = useState(initBreakM);
  const [breakS, setBreakS] = useState(initBreakS);

  // Cycle repeat
  const [repeatCycle, setRepeatCycle] = useState(initLoops);

  // UI state
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState(null);

  const userId = localStorage.getItem("userId");

  // Save
  const handleSave = async () => {
    const focusTotal = toSec(focusH, focusM, focusS);
    if (focusTotal === 0) { setError("Focus time cannot be zero."); return; }

    setSaving(true);
    setError(null);

    const body = {
      focus_time:  focusTotal,
      break_time:  toSec(breakH, breakM, breakS),
      break_loops: repeatCycle + 1,
      owner_id:    userId,
    };

    try {
      if (isEdit) {
        // Update existing timer
        await fetch(`${API}/timers/${preset.id}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        });
      } else {
        // Create new timer
        await fetch(`${API}/timers`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        });
      }
      navigate(-1);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!isEdit || !preset?.id) return;
    setSaving(true);
    try {
      await fetch(`${API}/timers/${preset.id}`, { method: "DELETE" });
      navigate(-1);
    } catch (err) {
      setError("Failed to delete preset.");
      setSaving(false);
    }
  };

  return (
    <div className="h-full bg-bg flex flex-col" style={{ position: "relative" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-[32px] pt-12 pb-[12px]">
        {isEdit ? (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="text-gray-400 hover:text-red-500 transition-colors active:scale-90"
          >
            <img src="src/assets/icons/trash.png" alt="Delete" />
          </button>
        ) : (
          <div className="w-[32px]" />
        )}

        <h1>{isEdit ? "Edit Preset" : "New Preset"}</h1>
        <div className="w-[32px]" />
      </div>

      {/* Content */}
      <div className="flex flex-col px-[16px] gap-[12px] overflow-y-auto pb-28 pt-4">
        {/* Error message */}
        {error && (
          <div style={{
            background: "#fee2e2",
            borderRadius: "12px",
            padding: "10px 14px",
            color: "#dc2626",
            fontSize: "14px",
            fontFamily: "inter",
          }}>
            {error}
          </div>
        )}

        {/* Focus + Break in one card */}
        <div className="bg-white rounded-[20px] p-[16px] flex flex-col gap-[16px]">
          {/* Focus Timer Row */}
          <div className="flex items-center justify-between">
            <span className="nbold">Focus Timer</span>
            <button
              onClick={() => setShowFocusModal(true)}
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
              {fmt(focusH, focusM, focusS)}
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "var(--color-bg)" }} />

          {/* Break Timer Row */}
          <div className="flex items-center justify-between">
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
              {fmt(breakH, breakM, breakS)}
            </button>
          </div>
        </div>

        {/* Times To Repeat Cycle */}
        <Row>
          <span className="nbold">Times To Repeat Cycle</span>
          <div style={{ background: "var(--color-quaternary)", borderRadius: "10px", padding: "6px 14px" }}>
            <select
              value={repeatCycle}
              onChange={(e) => setRepeatCycle(Number(e.target.value))}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                fontFamily: "inter",
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--color-black)",
                cursor: "pointer",
              }}
            >
              {[0, 1, 2, 3, 4, 5, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </Row>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px]">
        <button onClick={() => navigate(-1)} className="alt" disabled={saving}>
          Cancel
        </button>
        <button onClick={handleSave} className="default" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Focus Timer Modal */}
      {showFocusModal && (
        <NewTimer
          initialH={focusH}
          initialM={focusM}
          initialS={focusS}
          onCancel={() => setShowFocusModal(false)}
          onDiscard={(h, m, s) => {
            setFocusH(h); setFocusM(m); setFocusS(s);
            setShowFocusModal(false);
          }}
        />
      )}

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