// Still uses the old API system, and hasnt been reworked yet
// Will be reworked in the future
// NOT IDEAL, WILL BE WORKED ON

import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../lib/api";

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

function dataURLtoFile(dataUrl, filename = "verification.jpg") {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function Row({ children, onClick }) {
  const base = "gap-[8px] bg-white rounded-[20px] p-[16px] flex items-center justify-between";
  return onClick ? (
    <button onClick={onClick} className={`${base} w-full text-left`}>{children}</button>
  ) : (
    <div className={base}>{children}</div>
  );
}

export default function Verification() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const isMobile = state?.isMobile ?? false;
  const initialImage = state?.imageDataUrl ?? null;
  const task = state?.task ?? null;
  const authorUsername = state?.authorUsername ?? "";
  const authorId = state?.authorId ?? "";
  // Use family from task state — no more hardcoding
  const familyId = state?.familyId ?? task?.family?.[0] ?? null;

  const [image, setImage] = useState(initialImage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const cropped = await cropToSquare(file);
      setImage(cropped);
      setError(null);
    } catch (err) {
      setError("Failed to process image. Please try again.");
      console.error(err);
    }
    e.target.value = "";
  };

  const triggerPicker = () => inputRef.current?.click();

  const handleSave = async () => {
    if (!image) return;
    if (!familyId) {
      setError("No competition linked to this task. Make sure the task has a competitive tag from a competition.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // 1. Upload image
      const formData = new FormData();
      formData.append("file", dataURLtoFile(image));
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "X-User-Id": authorId },
        body: formData,
      });
      if (!uploadRes.ok) {
        const { error: msg } = await uploadRes.json().catch(() => ({}));
        throw new Error(msg || "Image upload failed");
      }
      const { url: imageUrl } = await uploadRes.json();

      // 2. Build competitive tags payload
      const competitiveTagIds = task?.competitive_tag_ids ?? [];

      // 3. Create post
      const postBody = {
        title: `${authorUsername || "Someone"} completed ${task?.name ?? "a task"}`,
        description: JSON.stringify({
          competitive_tag_ids: competitiveTagIds,
        }),
        type: "Task Completed",
        status: "Pending",
        family_id: familyId,
        related_task: state?.taskId ?? null,
        photo_url: imageUrl,
      };

      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": authorId,
        },
        body: JSON.stringify(postBody),
      });
      if (!postRes.ok) {
        const { error: msg } = await postRes.json().catch(() => ({}));
        throw new Error(msg || "Post creation failed");
      }

      navigate(`/feed?family=${familyId}`, { replace: true });
    } catch (err) {
      console.error("Failed to save verification:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Competitive tag names for display
  const tagNames = task?.competitive_tags ?? task?.labels ?? [];

  return (
    <div className="h-full bg-bg flex flex-col">
      <div className="flex items-center justify-center px-[32px] pt-12 pb-[24px]">
        <h1>Post Verification</h1>
      </div>

      <div className="flex flex-col px-[16px] gap-[16px] overflow-y-auto pb-28">
        {task?.name && (
          <p className="text-center text-sm text-gray-500 -mt-2">
            Verifying: <span className="nbold text-gray-800">{task.name}</span>
          </p>
        )}

        {tagNames.length > 0 && (
          <div className="flex gap-[8px] justify-center flex-wrap -mt-2">
            {tagNames.map((label, i) => (
              <span key={i} className="tag">{label}</span>
            ))}
          </div>
        )}

        <div className="w-full aspect-square rounded-[24px] overflow-hidden bg-white shadow-sm flex items-center justify-center">
          {image ? (
            <img src={image} alt="Verification" className="w-full h-full object-cover" />
          ) : (
            <button
              onClick={triggerPicker}
              className="flex flex-col items-center gap-3 text-gray-400 hover:text-gray-600 transition-colors p-8"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="ntype text-center">
                {isMobile ? "Tap to take a verification photo" : "Click to upload a verification image"}
              </span>
            </button>
          )}
        </div>

        {image && (
          <Row onClick={triggerPicker}>
            <span className="nbold text-[16px]">
              {isMobile ? "Retake Photo" : "Upload Different Image"}
            </span>
            <div className="add">
              <img src="src/assets/icons/schevron.svg" alt=">" />
            </div>
          </Row>
        )}

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          {...(isMobile ? { capture: "environment" } : {})}
          onChange={handleFilePicked}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px] bg-bg">
        <button onClick={() => navigate(-1)} className="button alt flex-1" type="button">Cancel</button>
        <button
          onClick={handleSave}
          disabled={saving || !image}
          className="button default flex-1"
          type="button"
        >
          {saving ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}