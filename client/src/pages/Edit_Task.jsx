import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${value ? "bg-violet-500" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-0"}`} />
    </button>
  );
}

function Row({ children, onClick, className = "" }) {
  const base = "row";
  if (onClick)
    return <button onClick={onClick} className={`${base} w-full text-left ${className}`}>{children}</button>;
  return <div className={`${base} ${className}`}>{children}</div>;
}

export default function EditTask() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const task = location.state?.task;

  const [name, setName] = useState(task?.name ?? "");
  const [date, setDate] = useState(task?.time ? task.time.split("T")[0] : "");
  const [time, setTime] = useState(task?.time ? task.time.split("T")[1]?.slice(0, 5) : "");
  const [loc, setLoc] = useState(task?.location ?? "");
  const [priority, setPriority] = useState(task?.priority ?? null);
  const [pinned, setPinned] = useState(task?.pinned ?? false);
  const [isPrivate, setIsPrivate] = useState(task?.is_private ?? false);
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState(task?.competitive_tag_ids ?? []);
  const [selectedTagNames, setSelectedTagNames] = useState(task?.competitive_tags ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Restore draft or picks when returning from sub-pages
  useEffect(() => {
    const draft = sessionStorage.getItem("editTaskDraft");
    if (draft) {
      const d = JSON.parse(draft);
      setName(d.name ?? "");
      setDate(d.date ?? "");
      setTime(d.time ?? "");
      setLoc(d.loc ?? "");
      setPriority(d.priority ?? null);
      setSelectedFolders(d.selectedFolders ?? []);
      setSelectedTagIds(d.selectedTagIds ?? []);
      setSelectedTagNames(d.selectedTagNames ?? []);
      setPinned(d.pinned ?? false);
      setIsPrivate(d.isPrivate ?? false);
      sessionStorage.removeItem("editTaskDraft");
    }

    const folderPick = sessionStorage.getItem("selectedFolders");
    if (folderPick) {
      setSelectedFolders(JSON.parse(folderPick));
      sessionStorage.removeItem("selectedFolders");
    }

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

  useEffect(() => {
    if (!user?.id) return;
    apiFetch(`/api/folders`)
      .then((data) => {
        if (task?.folder?.length)
          setSelectedFolders(data.filter(f => task.folder.includes(f.id)));
      })
      .catch(console.error);
  }, [user?.id]);

  const saveDraft = () => {
    sessionStorage.setItem("editTaskDraft", JSON.stringify({
      name, date, time, loc, priority, selectedFolders,
      selectedTagIds, selectedTagNames, pinned, isPrivate,
    }));
  };

  const handleAddTags = () => {
    saveDraft();
    const familyId = task?.family?.[0] || "";
    navigate(`/tag-setup?flow=add_tags${familyId ? `&family=${familyId}` : ""}`, {
      state: { flow: "add_tags", familyId },
    });
  };

  const removeTag = (tagId) => {
    const idx = selectedTagIds.indexOf(tagId);
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
    setSelectedTagNames(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim() || !task?.id) return;
    setSaving(true);
    const combinedTime = date && time ? `${date}T${time}:00` : null;
    try {
      await apiFetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        body: {
          name: name.trim(),
          pinned,
          ...(priority && { priority }),
          ...(combinedTime && { time: combinedTime }),
          ...(loc.trim() && { location: loc.trim() }),
          ...(selectedTagIds.length && { competitive_tags: selectedTagIds }),
          ...(selectedFolders.length && { folders: selectedFolders.map(f => f.id) }),
          is_private: isPrivate,
        },
      });
      navigate("/home");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!task?.id) return;
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: "PUT", body: { status: "Complete" } });
      navigate("/home");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!task?.id) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      navigate("/home");
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (!task) { navigate("/home"); return null; }

  return (
    <div className="h-full bg-bg flex flex-col">
      <div className="flex items-center justify-between px-[32px] pt-12 pb-[12px]">
        <button onClick={handleDelete} disabled={deleting}
          className="text-gray-400 hover:text-red-500 transition-colors active:scale-90">
          <img src="src/assets/icons/trash.png" alt="Delete" />
        </button>
        <h1>Edit Task</h1>
        <button onClick={() => setPinned(p => !p)} className="transition-colors active:scale-90">
          <img src={pinned ? "/src/assets/icons/pinfill.svg" : "/src/assets/icons/pin.svg"} alt="Pin" />
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
            <input type="text" placeholder="Location" value={loc}
              onChange={(e) => setLoc(e.target.value)} className="w-full" />
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
              {selectedFolders.map(f => <span key={f.id} className="tag">{f.name}</span>)}
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
            {selectedTagNames.map((tagName, i) => (
              <span key={selectedTagIds[i] || i} className="tag flex items-center gap-1">
                {tagName}
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
        <button onClick={() => navigate(-1)} className="button alt !w-[98.5px]">Cancel</button>
        <button onClick={handleComplete} className="button default !w-[148px]">Complete</button>
        <button onClick={handleSave} disabled={saving || !name.trim()} className="button default !w-[98.5px]">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}