// NOT IDEAL, WILL BE WORKED ON

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, ChevronRight } from "lucide-react";
import { apiFetch } from "../lib/api";

function Row({ children, onClick }) {
  const base =
    "gap-[8px] bg-white rounded-[20px] p-[16px] flex items-center justify-between";

  return onClick ? (
    <button onClick={onClick} className={`${base} w-full text-left`}>
      {children}
    </button>
  ) : (
    <div className={base}>{children}</div>
  );
}

// Main Page
export default function ChangePost() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState("Make Prototype");
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(URL.createObjectURL(file));
  };

  const handleUpdate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      navigate(-1);
    } catch (err) {
      console.error("Failed to update post:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full bg-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-[32px] pt-12 pb-[12px]">
        <button
          className="text-gray-400 hover:text-red-500 transition-colors active:scale-90"
        >
          <img src="src/assets/icons/trash.png" alt="Delete" />
        </button>
        <h1>Change Post</h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex flex-col px-[16px] gap-[12px] overflow-y-auto pb-28">
        {/* Task name */}
        <input
          type="text"
          value={name}
          placeholder="Task Title"
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white rounded-[20px] px-4 py-4"
        />

        {/* Changed Tags */}
        <Row>
          <span className="nbold">Revised Tags</span>
          <button className="buttonS">Edit</button>
        </Row>

        {/* Retake Verification Image */}
        <Row onClick={() => fileInputRef.current?.click()}>
          <span className="nbold">Retake Verification Image</span>
          <div className="add"><img src="src/assets/icons/schevron.svg"></img></div>
        </Row>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImagePick}
          className="hidden"
        />

        {/* Verification image preview */}
        <div className="w-full aspect-square rounded-[20px] overflow-hidden bg-white">
          {image ? (
            <img src={image} alt="Verification" className="postimg object-cover" />
          ) : (
            // Placeholder for existing server image
            <img
              src="/api/posts/current/image"
              alt="Verification"
              className="postimg object-cover"
            />
          )}
        </div>

        {/* Disclaimer */}
        <small className="px-[16px] text-dark-gray">
          Changing a post will revoke all current verifications and mark your
          post as pending
        </small>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px]">
        <button onClick={() => navigate(-1)} className="button alt">
          Cancel
        </button>
        <button
          onClick={handleUpdate}
          disabled={saving || !name.trim()}
          className="button default"
        >
          Update
        </button>
      </div>
    </div>
  );
}