import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, MapPin, Star, ChevronLeft, ChevronDown, ChevronUp, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../lib/api";

const STRIPE_STYLE = `
@keyframes stripe-shrink {
  from { width: 100%; }
  to   { width: 0%;   }
}
`;

const isMobileDevice = () =>
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  window.matchMedia("(pointer: coarse)").matches;

const cropToSquare = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      canvas.getContext("2d").drawImage(
        img,
        (img.naturalWidth - size) / 2, (img.naturalHeight - size) / 2,
        size, size, 0, 0, size, size
      );
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = url;
  });

function Stars({ priority }) {
  const count = priority === "High" ? 3 : priority === "Medium" ? 2 : priority === "Low" ? 1 : 0;
  if (!count) return null;
  return (
    <span className="flex items-center gap-0.5 ml-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={13} fill="currentColor" className="text-gray-900" />
      ))}
    </span>
  );
}

function TagList({ tags }) {
  if (!Array.isArray(tags) || !tags.length) return null;
  return (
    <div className="flex gap-1.5 mt-2 parent-container scroll-container">
      {tags.map((tag, i) => (
        <span key={i} className="tag">{tag}</span>
      ))}
    </div>
  );
}

function getTimeLeft(isoString) {
  if (!isoString) return "";
  const diff = new Date(isoString) - new Date();
  if (diff <= 0) return "Expired";
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);
  if (days > 0)   return `${days}d ${hours % 24}h`;
  if (hours > 0)  return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function TaskMeta({ time, location, isPrivate }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!time) return;
    const update = () => setTimeLeft(getTimeLeft(time));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [time]);

  if (!time && !location && !isPrivate) return null;
  return (
    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
      {isPrivate && (
        <span className="flex items-center">
          <span className="w-[14px] h-[14px]" style={{
            backgroundColor: "var(--color-primary)",
            maskImage: 'url("src/assets/icons/lock.svg")',
            WebkitMaskImage: 'url("src/assets/icons/lock.svg")',
            maskSize: "contain", WebkitMaskSize: "contain",
            maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
          }} aria-label="Private Task" />
        </span>
      )}
      {time     && <span className="flex items-center gap-1"><Clock size={14} /> {timeLeft}</span>}
      {location && <span className="flex items-center gap-1"><MapPin size={14} /> {location}</span>}
    </div>
  );
}

// TaskCard

function TaskCard({ task, onToggle, onEdit, isPending = false }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const done = task.status === "Complete";
  const [loading, setLoading] = useState(false);
  const cameraInputRef = useRef(null);

  const needsVerification = (t) =>
    !t.is_private &&
    Array.isArray(t.competitive_tag_ids) && t.competitive_tag_ids.length > 0;

  const buildVerificationState = (extras = {}) => ({
    taskId: task.id,
    task,
    authorId: user?.id,
    authorUsername: user?.username,
    familyId: task.family?.[0] || null,
    ...extras,
  });

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (done) {
      await onToggle(task.id, "Incomplete");
      return;
    }
    setLoading(true);
    await onToggle(task.id, "Complete");
    setLoading(false);

    if (needsVerification(task)) {
      if (isMobileDevice()) {
        cameraInputRef.current?.click();
      } else {
        navigate("/verification", { state: buildVerificationState({ isMobile: false }) });
      }
    }
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imageDataUrl = await cropToSquare(file);
      navigate("/verification", { state: buildVerificationState({ imageDataUrl, isMobile: true }) });
    } catch (err) {
      console.error("Failed to process image:", err);
    }
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
        aria-hidden="true"
      />
      <div
        onClick={() => onEdit(task)}
        className="relative rounded-[20px] px-[16px] py-[8px] flex items-center gap-[16px] cursor-pointer active:scale-[0.98] transition-all duration-300 overflow-hidden"
        style={{
          backgroundColor: isPending
            ? "var(--color-pending-bg, #f0fdf4)"
            : "white",
          boxShadow: isPending
            ? "0 0 0 2px var(--color-pending-ring, #bbf7d0)"
            : undefined,
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <span className="nbold truncate">{task.name}</span>
            <Stars priority={task.priority} />
          </div>
          <TagList tags={task.competitive_tags || task.labels} />
          <TaskMeta time={task.time} location={task.location} isPrivate={task.is_private} />
        </div>

        <button
          onClick={handleToggle}
          disabled={loading}
          className="mt-0.5 flex-shrink-0 active:scale-90 transition-transform disabled:opacity-50"
          aria-label={done ? "Mark incomplete" : "Mark complete"}
        >
          <img
            src={done ? "src/assets/icons/checkt.svg" : "src/assets/icons/checkf.svg"}
            width={28} height={28} alt="Toggle status"
          />
        </button>

        {/* 5-second shrinking stripe */}
        {isPending && (
          <div
            className="absolute bottom-0 left-0 h-[3px] rounded-b-[20px]"
            style={{
              backgroundColor: "var(--color-primary, #7C3AED)",
              animation: "stripe-shrink 5s linear forwards",
            }}
          />
        )}
      </div>
    </>
  );
}

// Graveyard task card

function GraveyardTaskCard({ task }) {
  return (
    <div className="bg-white rounded-[20px] px-[16px] py-[8px] flex items-center gap-[16px] opacity-50 select-none">
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <span
            className="nbold truncate text-gray-400"
            style={{ textDecoration: "line-through" }}
          >
            {task.name}
          </span>
          <Stars priority={task.priority} />
        </div>
        <TagList tags={task.competitive_tags || task.labels} />
        <TaskMeta time={task.time} location={task.location} isPrivate={task.is_private} />
      </div>
      <img
        src="src/assets/icons/checkt.svg"
        width={28} height={28} alt="Completed"
        className="flex-shrink-0 opacity-40"
      />
    </div>
  );
}

// Task Graveyard section

function TaskGraveyard({ tasks, scrollContainerRef }) {
  const [open, setOpen] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;
    const handleScroll = () => {
      const headerTop = headerRef.current?.getBoundingClientRect().top ?? 0;
      setShowBackToTop(headerTop < 0);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef]);

  const scrollToTop = () => {
    scrollContainerRef?.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!tasks.length) return null;

  return (
    <section className="flex flex-col gap-[16px]" ref={headerRef}>
      {/* Header row */}
      <div className="flex items-center justify-between px-[4px]">
        <h1>Task Graveyard</h1>

        <div className="flex items-center gap-[8px]">
          {/* Count badge */}
          <span
            className="xs text-dark-gray bg-white rounded-full px-[10px] py-[2px]"
            style={{ minWidth: 28, textAlign: "center" }}
          >
            {tasks.length}
          </span>

          {/* Collapse / expand */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="buttonS white flex items-center gap-1"
            aria-label={open ? "Collapse graveyard" : "Expand graveyard"}
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {/* Task list */}
      {open && (
        <div className="flex flex-col gap-[16px] relative">
          {tasks.map((task) => (
            <GraveyardTaskCard key={task.id} task={task} />
          ))}

          {/* Back-to-top */}
          {showBackToTop && (
            <button
              onClick={scrollToTop}
              className="sticky bottom-4 self-end mr-2 flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-md active:scale-90 transition-transform"
              aria-label="Back to top"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
            >
              <ArrowUp size={16} className="text-gray-600" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// FolderOverlay

function FolderOverlay({ folder, allTasks, onToggle, onEdit, onClose, pendingIds }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };

  // In the overlay we show tasks that aren't in the graveyard
  const folderTasks = allTasks.filter(
    (t) => Array.isArray(t.folder) && t.folder.includes(folder.id) && t.status !== "Complete"
  );
  const pinned  = folderTasks.filter((t) => t.pinned);
  const regular = folderTasks.filter((t) => !t.pinned);

  return (
    <div className="absolute inset-0 z-40" style={{
      transform: visible ? "translateY(0)" : "translateY(100%)",
      opacity:   visible ? 1 : 0,
      transition: "transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms ease",
    }}>
      <div className="h-full bg-bg flex flex-col">
        <div className="flex items-center gap-[22px] px-[32px] pt-12 pb-[12px]">
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-900 active:scale-90 transition-transform">
            <ChevronLeft size={26} strokeWidth={2.5} />
          </button>
          <h1 className="truncate">{folder.name}</h1>
        </div>
        <div className="flex flex-col px-[16px] gap-[16px] overflow-y-auto pb-28">
          {pinned.length > 0 && (
            <section className="flex flex-col gap-[16px]">
              <h1 className="px-[4px]">Pinned Tasks</h1>
              <div className="flex flex-col gap-[16px]">
                {pinned.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    isPending={pendingIds.has(task.id)}
                  />
                ))}
              </div>
            </section>
          )}
          <section className="flex flex-col gap-[16px]">
            <h1 className="px-[4px]">Tasks</h1>
            {regular.length > 0 ? (
              <div className="flex flex-col gap-[16px]">
                {regular.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    isPending={pendingIds.has(task.id)}
                  />
                ))}
              </div>
            ) : pinned.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No tasks in this folder yet.</p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

// Home

export default function Home({ onNotifications }) {
  const navigate = useNavigate();
  const { user } = useUser();

  const [tasks,        setTasks]        = useState([]);
  const [folders,      setFolders]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeFolder, setActiveFolder] = useState(null);

  // Graveyard state
  const [graveyardIds, setGraveyardIds] = useState(new Set());
  const [pendingIds,   setPendingIds]   = useState(new Set());
  const pendingTimers = useRef({});

  const scrollRef = useRef(null); // ref for the main scroll container

  // Load tasks & folders
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.allSettled([
      apiFetch(`/api/tasks?owner=${user.id}`),
      apiFetch(`/api/folders`),
    ]).then(([tasksResult, foldersResult]) => {
      if (tasksResult.status === "fulfilled") {
        const taskData = tasksResult.value;
        setTasks(taskData);
        // Tasks already marked Complete on load go straight to graveyard
        const completedIds = taskData
          .filter((t) => t.status === "Complete")
          .map((t) => t.id);
        setGraveyardIds(new Set(completedIds));
      } else {
        console.error("Failed to load tasks:", tasksResult.reason);
      }
      if (foldersResult.status === "fulfilled") setFolders(foldersResult.value);
      else console.error("Failed to load folders:", foldersResult.reason);
    }).finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    return () => {
      Object.values(pendingTimers.current).forEach(clearTimeout);
    };
  }, []);

  const toggleTask = useCallback(async (taskId, newStatus) => {
    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: "PUT", body: { status: newStatus } });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error("Failed to toggle task:", err);
      return;
    }

    if (newStatus === "Complete") {
      // Start 5-second pending window
      setPendingIds((prev) => new Set([...prev, taskId]));

      const timerId = setTimeout(() => {
        // Grace period expired → send to graveyard
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        setGraveyardIds((prev) => new Set([...prev, taskId]));
        delete pendingTimers.current[taskId];
      }, 5000);

      pendingTimers.current[taskId] = timerId;

    } else {
      // Unchecked — cancel pending timer and remove from graveyard
      if (pendingTimers.current[taskId]) {
        clearTimeout(pendingTimers.current[taskId]);
        delete pendingTimers.current[taskId];
      }
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      setGraveyardIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, []);

  const editTask   = useCallback((task) => navigate("/edittask", { state: { task } }), [navigate]);
  const openFolder = useCallback((folderId) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) setActiveFolder(folder);
  }, [folders]);

  // Derived task buckets
  // Active = not in graveyard (pending tasks stay visible with the stripe)
  const activeTasks   = tasks.filter((t) => !graveyardIds.has(t.id));
  const graveyardList = tasks.filter((t) =>  graveyardIds.has(t.id));

  const pinned  = activeTasks.filter((t) => t.pinned);
  const regular = activeTasks.filter((t) => !t.pinned);

  return (
    <>
      {/* Inject stripe keyframe once */}
      <style>{STRIPE_STYLE}</style>

      <div
        className={`h-full bg-bg flex flex-col relative ${activeFolder ? "overflow-hidden" : ""}`}
      >
        <Header onNotifications={onNotifications} />

        {/* Main scroll container */}
        <div
          ref={scrollRef}
          className="flex flex-col px-[16px] gap-[16px] pb-28 overflow-y-auto"
        >
          {/* Folders */}
          <div className="flex items-center justify-between">
            <h1 className="px-[16px]">Folders</h1>
            <button onClick={() => navigate("/managefolders")} className="buttonS white">
              Manage Folders
            </button>
          </div>

          <section className="grid gap-[8px] grid-cols-3">
            {folders.slice(0, 4).map((folder) => (
              <button
                key={folder.id}
                onClick={() => openFolder(folder.id)}
                className="flex rounded-[10px] p-[8px] flex-col bg-white w-[115px] active:scale-95 transition-transform text-left"
              >
                <small className="truncate">{folder.name}</small>
                <span className="xs text-dark-gray">{folder.task_count}</span>
              </button>
            ))}
          </section>

          {/* Pinned tasks */}
          {pinned.length > 0 && (
            <section className="flex flex-col gap-[16px]">
              <h1 className="px-[16px]">Pinned Tasks</h1>
              <div className="flex flex-col gap-[16px]">
                {pinned.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onEdit={editTask}
                    isPending={pendingIds.has(task.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Regular tasks */}
          <section className="flex flex-col gap-[16px]">
            <h1 className="px-[16px]">Tasks</h1>
            {loading ? (
              <div className="flex flex-col gap-[16px]">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl px-4 py-3.5 h-16 animate-pulse" />
                ))}
              </div>
            ) : regular.length > 0 ? (
              <div className="flex flex-col gap-[16px]">
                {regular.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onEdit={editTask}
                    isPending={pendingIds.has(task.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">No tasks yet.</p>
            )}
          </section>

          {/* ── Task Graveyard ── */}
          <TaskGraveyard tasks={graveyardList} scrollContainerRef={scrollRef} />
        </div>

        {/* Folder overlay */}
        {activeFolder && (
          <FolderOverlay
            folder={activeFolder}
            allTasks={tasks}
            onToggle={toggleTask}
            onEdit={editTask}
            onClose={() => setActiveFolder(null)}
            pendingIds={pendingIds}
          />
        )}
      </div>
    </>
  );
}