import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Clock, MapPin, X } from "lucide-react";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../lib/api";

function StarPriority({ value, onChange }) {
  const levels = ["Low", "Medium", "High"];
  const filled = levels.indexOf(value) + 1;
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((i) => (
        <button key={i} onClick={() => onChange(i === filled ? null : levels[i - 1])}>
          <svg viewBox="0 0 24 24" className="w-6 h-6"
            fill={i <= filled ? "#1a1a2e" : "none"} stroke="#1a1a2e" strokeWidth={1.5}>
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full ${value ? "bg-primary" : "bg-dark-gray"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full ${value ? "translate-x-6" : ""}`} />
    </button>
  );
}

function Row({ children, onClick }) {
  const base = "gap-[8px] bg-white rounded-[20px] p-[16px] flex items-center justify-between";
  return onClick ? (
    <button onClick={onClick} className={`${base} w-full text-left`}>{children}</button>
  ) : (
    <div className={base}>{children}</div>
  );
}

export default function NewTask() {
  const navigate = useNavigate();
  const location = useLocation(); // Was used in old system, might return
  const [searchParams] = useSearchParams();
  const { user } = useUser();

  const familyId = searchParams.get("family");

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [taskLocation, setTaskLocation] = useState("");
  const [priority, setPriority] = useState(null);
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedTagNames, setSelectedTagNames] = useState([]);
  const [isPrivate, setIsPrivate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinned, setPinned] = useState(false);

  // Restore draft when returning from navigation
  useEffect(() => {
    const draft = sessionStorage.getItem("newTaskDraft");
    if (draft) {
      const d = JSON.parse(draft);
      setName(d.name ?? "");
      setDate(d.date ?? "");
      setTime(d.time ?? "");
      setTaskLocation(d.taskLocation ?? "");
      setPriority(d.priority ?? null);
      setSelectedFolders(d.selectedFolders ?? []);
      setSelectedTagIds(d.selectedTagIds ?? []);
      setSelectedTagNames(d.selectedTagNames ?? []);
      setIsPrivate(d.isPrivate ?? false);
      setPinned(d.pinned ?? false);
      sessionStorage.removeItem("newTaskDraft");
    }

    const folderPick = sessionStorage.getItem("selectedFolders");
    if (folderPick) {
      setSelectedFolders(JSON.parse(folderPick));
      sessionStorage.removeItem("selectedFolders");
    }

    // Restore tag selections returned from Tag_Setup
    const tagPick = sessionStorage.getItem("selectedTagIds");
    if (tagPick) {
      setSelectedTagIds(JSON.parse(tagPick));
      sessionStorage.removeItem("selectedTagIds");
    }
    const tagNames = sessionStorage.getItem("selectedTagNames");
    if (tagNames) {
      setSelectedTagNames(JSON.parse(tagNames));
      sessionStorage.removeItem("selectedTagNames");
    }
  }, []);

  const saveDraft = () => {
    sessionStorage.setItem("newTaskDraft", JSON.stringify({
      name, date, time, taskLocation, priority, selectedFolders,
      selectedTagIds, selectedTagNames, isPrivate, pinned,
    }));
  };

  const handleAddTags = () => {
    saveDraft();
    navigate(`/tag-setup?flow=add_tags${familyId ? `&family=${familyId}` : ""}`, {
      state: { flow: "add_tags", familyId },
    });
  };

  const removeTag = (tagId) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
    setSelectedTagNames(prev => prev.filter((_, i) => selectedTagIds[i] !== tagId));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const combinedTime = date && time ? `${date}T${time}:00` : null;
    setSaving(true);
    try {
      await apiFetch("/api/tasks", {
        method: "POST",
        body: {
          name: name.trim(),
          status: "Incomplete",
          ...(pinned && { pinned: true }),
          ...(combinedTime && { time: combinedTime }),
          ...(taskLocation && { location: taskLocation }),
          ...(priority !== null && { priority }),
          ...(selectedTagIds.length && { competitive_tags: selectedTagIds }),
          ...(selectedFolders.length && { folders: selectedFolders.map(f => f.id) }),
          ...(isPrivate && { is_private: true }),
          ...(familyId && { family: familyId }),
          owner_id: user.id,
        },
      });
      navigate("/home");
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full bg-bg flex flex-col">
      <div className="flex items-center justify-between px-[32px] pt-12 pb-[12px]">
        <div className="w-8" />
        <h1>New Task</h1>
        <button onClick={() => setPinned(p => !p)}>
          <img src={pinned ? "/src/assets/icons/pinfill.svg" : "/src/assets/icons/pin.svg"} width={30} height={30} />
        </button>
      </div>

      <div className="flex flex-col px-[16px] gap-[12px] overflow-y-auto pb-28">
        <input
          type="text"
          placeholder="Task name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white rounded-2xl px-4 py-4"
        />

        <div className="flex flex-col py-[16px] gap-[12px]">
          <span className="nbold px-[16px]">Add Reminder</span>
          <Row>
            <Clock size={20} />
            <div className="flex gap-[8px] w-full px-[8px]">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </Row>
          <Row>
            <MapPin size={20} />
            <input
              type="text"
              placeholder="Location"
              value={taskLocation}
              onChange={(e) => setTaskLocation(e.target.value)}
              className="w-full"
            />
          </Row>
        </div>

        <div className="flex flex-col py-[16px] gap-[12px]">
          <Row>
            <span className="nbold">{priority || "Select Priority"}</span>
            <StarPriority value={priority} onChange={setPriority} />
          </Row>

          <Row onClick={() => {
            saveDraft();
            navigate("/selectfolder", { state: { alreadySelected: selectedFolders } });
          }}>
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <span className="nbold">Add To Folder</span>
              {selectedFolders.map(f => (
                <span key={f.id} className="tag">{f.name}</span>
              ))}
            </div>
            <div className="add"><img src="src/assets/icons/splus.svg" /></div>
          </Row>

          <Row onClick={() => console.log("collaborators")}>
            <span className="nbold">Add Collaborators</span>
            <div className="add"><img src="src/assets/icons/schevron.svg" /></div>
          </Row>
        </div>

        {/* Competitive Tags */}
        <Row onClick={handleAddTags}>
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <span className="nbold">Add Tags</span>
            {selectedTagNames.map((name, i) => (
              <span key={selectedTagIds[i] || i} className="tag flex items-center gap-1">
                {name}
                <button className="p-[2px]" onClick={(e) => { e.stopPropagation(); removeTag(selectedTagIds[i]); }}>
                  <svg viewBox="0 0 10 10" width={10} height={10} stroke="white" strokeWidth={1.5}>
                    <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="add"><img src="src/assets/icons/splus.svg" /></div>
        </Row>

        <Row>
          <span className="nbold">Private</span>
          <Toggle value={isPrivate} onChange={setIsPrivate} />
        </Row>
        <small className="px-[16px] text-dark-gray">
          A private task will not be visible to competitors upon completion. Therefore points can't be earned from them.
        </small>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px]">
        <button onClick={() => navigate(-1)} className="button alt">Cancel</button>
        <button onClick={handleSave} disabled={saving || !name.trim()} className="button default">
          Save
        </button>
      </div>
    </div>
  );
}