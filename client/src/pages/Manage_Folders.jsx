import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, GripVertical } from "lucide-react";
import { useUser } from "../context/UserContext";

import { apiFetch } from "../lib/api";

// Confirm Dialog
function ConfirmDialog({ message, subtext, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center pb-8 px-4">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 flex flex-col gap-[16px] shadow-xl">
        <div className="flex flex-col gap-[6px] text-center">
          <p className="nbold text-[17px]">{message}</p>
          {subtext && <p className="text-sm text-gray-400">{subtext}</p>}
        </div>
        <div className="flex flex-col gap-[8px]">
          <button
            className="w-full py-3 rounded-2xl bg-red-500 text-white font-semibold active:scale-95 transition-transform"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold active:scale-95 transition-transform"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Editable folder name
function EditableFolderName({ folder, onRename }) {
  const [value, setValue] = useState(folder.name);
  const inputRef = useRef(null);

  useEffect(() => setValue(folder.name), [folder.name]);

  const handleBlur = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== folder.name) onRename(folder.id, trimmed);
    else setValue(folder.name);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter")  inputRef.current?.blur();
        if (e.key === "Escape") { setValue(folder.name); inputRef.current?.blur(); }
      }}
      className="text-[15px] font-medium text-gray-800 bg-transparent border-b border-transparent focus:border-violet-400 focus:outline-none w-full cursor-text"
    />
  );
}

// Main screen
export default function ManageFolders() {
  const navigate  = useNavigate();
  const { user }  = useUser();

  const [folders,       setFolders]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating,    setIsCreating]    = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [draggingId,    setDraggingId]    = useState(null);

  const listRef      = useRef(null);
  const foldersRef   = useRef(folders);
  foldersRef.current = folders;

  useEffect(() => {
    if (!user?.id) return;
    apiFetch(`/api/folders`)
      .then((data) => { setFolders(data); setLoading(false); })
      .catch((err)  => { console.error(err); setLoading(false); });
  }, [user?.id]);

  const refreshFolders = () =>
    apiFetch(`/api/folders`).then(setFolders).catch(console.error);

  // CRUD
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const result = await apiFetch("/api/folders", {
        method: "POST",
        body: { name: newFolderName.trim(), owner_id: user.id },
      });
      if (result.success) { await refreshFolders(); setNewFolderName(""); setIsCreating(false); }
    } catch (err) { console.error(err); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/folders/${deleteTarget.id}`, { method: "DELETE" });
      setFolders(prev => prev.filter(f => f.id !== deleteTarget.id));
    } catch (err) { console.error(err); }
    finally { setDeleteTarget(null); }
  };

  const handleRenameFolder = async (folderId, newName) => {
    try {
      await apiFetch(`/api/folders/${folderId}`, { method: "PUT", body: { name: newName } });
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName } : f));
    } catch (err) { console.error(err); }
  };

  // Track by folder ID so index shifts don't break anything.
  const getDragHandleProps = (folderId) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      setDraggingId(folderId);

      const onMove = (me) => {
        const listEl = listRef.current;
        if (!listEl) return;

        // Find which slot the pointer is hovering over
        const rows = Array.from(listEl.querySelectorAll("[data-folder-row]"));
        let hoverIndex = -1;
        rows.forEach((row, i) => {
          const rect = row.getBoundingClientRect();
          if (me.clientY >= rect.top && me.clientY < rect.bottom) hoverIndex = i;
        });
        if (hoverIndex === -1) return;

        const current = foldersRef.current;
        const fromIndex = current.findIndex(f => f.id === folderId);
        if (fromIndex === -1 || fromIndex === hoverIndex) return;

        // Reorder
        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(hoverIndex, 0, moved);
        setFolders(next);
      };

      const onUp = async () => {
        setDraggingId(null);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup",   onUp);

        // Save new order
        const ordered = foldersRef.current.map(f => f.id);
        try {
          await apiFetch("/api/folders/reorder", {
            method: "POST",
            body: { order: ordered },
      });
  } catch (err) { console.error("Failed to save folder order", err); }
};

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup",   onUp);
    },
  });

  return (
    <div className="h-full bg-bg flex flex-col relative">

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.name}"?`}
          subtext="Tasks inside won't be deleted, just unlinked from this folder."
          confirmLabel="Delete Folder"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <div className="pt-14 pb-4 text-center">
        <h1>Manage Folders</h1>
      </div>

      <div className="flex flex-col flex-1 min-h-0 px-[16px] gap-[16px] overflow-y-auto pb-28">

        {/* Folder list */}
        <div ref={listRef} className="bg-white rounded-[20px] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : folders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No folders yet.</div>
          ) : (
            folders.map((folder, index) => (
              <div
                key={folder.id}
                data-folder-row
                style={{
                  opacity:    draggingId === folder.id ? 0.4 : 1,
                  transition: "opacity 150ms ease",
                }}
              >
                <div className="w-full flex items-center gap-3 px-4 py-4">
                  {/* Drag handle */}
                  <div
                    {...getDragHandleProps(folder.id)}
                    className="text-gray-300 touch-none select-none cursor-grab active:cursor-grabbing flex-shrink-0"
                  >
                    <GripVertical size={18} />
                  </div>

                  {/* Name + count */}
                  <div className="flex-1 min-w-0">
                    <EditableFolderName folder={folder} onRename={handleRenameFolder} />
                    <span className="xs text-dark-gray">{folder.task_count ?? 0} tasks</span>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteTarget(folder)}
                    className="text-gray-300 hover:text-red-400 transition-colors active:scale-90 flex-shrink-0"
                  >
                    <img src="/src/assets/icons/trash.png" alt="Delete" className="w-5 h-5 opacity-40 hover:opacity-100" />
                  </button>
                </div>
                {index !== folders.length - 1 && (
                  <div className="mx-5 border-b border-gray-100" />
                )}
              </div>
            ))
          )}
        </div>

        {/* New Folder Button */}
        {isCreating ? (
          <div className="bg-white rounded-[20px] overflow-hidden p-4">
            <div className="flex items-center gap-3 min-w-0">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="flex-1 min-w-0 px-3 py-2 rounded-md"   // <-- add min-w-0
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                autoFocus
              />
              <button onClick={() => { setNewFolderName(""); setIsCreating(false); }}
                className="flex items-center justify-center h-[40px] w-[40px] bg-light-gray rounded-full shrink-0">
                <img src="src/assets/icons/splus.svg" alt="Cancel" className="w-4 h-4 rotate-45" />
              </button>
              <button
                className="flex items-center justify-center h-[40px] w-[40px] bg-light-gray rounded-full shrink-0"
                onClick={handleCreateFolder}
              >
                <img src="src/assets/icons/check.svg" />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsCreating(true)} className="row">
            <div className="flex justify-between items-center w-full">
              <span className="nbold">New Folder</span>
              <Plus size={20} className="text-primary" />
            </div>
          </button>
        )}

        <small className="flex justify-center text-dark-gray">
          Hold <GripVertical size={12} className="inline mx-0.5" /> to reorder · Tap name to rename
        </small>

      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px]">
        <button onClick={() => navigate(-1)} className="button alt">
          Cancel
        </button>
        <button onClick={() => navigate(-1)} className="button default w-full">
          Save
        </button>
      </div>
    </div>
  );
}