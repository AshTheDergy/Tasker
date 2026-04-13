import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { useUser } from "../context/UserContext";

import { apiFetch } from "../lib/api";

export default function SelectFolders() {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const [folders, setFolders] = useState([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    
    apiFetch(`/api/folders`)
      .then((data) => {
        setFolders(data);
      
        if (location.state?.alreadySelected) {
          setSelectedFolderIds(
            new Set(location.state.alreadySelected.map(f => f.id))
          );
        }
      
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load folders:", err);
        setLoading(false);
      });
    
  }, [user?.id]);

  const toggleFolder = (folderId) => {
    const newSelection = new Set(selectedFolderIds);
    if (newSelection.has(folderId)) {
      newSelection.delete(folderId);
    } else {
      newSelection.add(folderId);
    }
    setSelectedFolderIds(newSelection);
  };

  const handleSave = () => {
    const selectedFolders = folders.filter((f) => selectedFolderIds.has(f.id));
    sessionStorage.setItem("selectedFolders", JSON.stringify(selectedFolders));
    navigate(-1);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const result = await apiFetch("/api/folders", {
        method: "POST",
        body: { name: newFolderName.trim(), owner_id: user.id },
      });
      if (result.success) {
        const updated = await apiFetch(`/api/folders`);
        setFolders(updated);
        setNewFolderName("");
        setIsCreating(false);
      }
    } catch (err) { console.error("Error creating folder:", err); }
  };

  return (
    <div className="h-full bg-bg flex flex-col">
      {/* Header */}
      <div className="pt-14 pb-6 text-center">
        <h1>Select Folders</h1>
      </div>

      {/* Folder List Container */}
      <div className="flex flex-col px-[16px] gap-[16px] overflow-y-auto pb-28">
        <div className="bg-white rounded-[20px] overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : (
            folders.map((folder, index) => (
              <div key={folder.id}>
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="w-full flex items-center px-6 py-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <img
                      src={selectedFolderIds.has(folder.id) ? "/src/assets/icons/checkt.svg" : "/src/assets/icons/checkf.svg"}
                      alt="select icon"
                      className="w-6 h-6 shrink-0"
                    />
                    <span className="nbold w-full truncate text-left">
                      {folder.name}
                    </span>
                  </div>
                </button>
                {index !== folders.length - 1 && (
                  <div className="mx-6 border-b border-gray-100" />
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
              className="flex-1 min-w-0 px-3 py-2 rounded-md"
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

        {/* Manage Folders Button */}
        <div className="flex justify-center">
          <button onClick={() => navigate("/managefolders")} className="buttonM">
            Manage Folders
          </button>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="absolute bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px]">
        <button onClick={() => navigate(-1)} className="button alt">
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="button default"
        >
          Save
        </button>
      </div>
      </div>
  );
}