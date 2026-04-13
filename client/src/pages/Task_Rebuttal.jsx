// Currently improvised, will be changed

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useUser } from "../context/UserContext";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TaskRebuttal() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useUser();

  const post = state?.post;

  const [comment, setComment] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedTagNames, setSelectedTagNames] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Restore proposed tags if returning from Tag_Setup
  useEffect(() => {
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
    const draftComment = sessionStorage.getItem("rebuttalDraftComment");
    if (draftComment) {
      setComment(draftComment);
      sessionStorage.removeItem("rebuttalDraftComment");
    }
  }, []);

  const handleEditTags = () => {
    sessionStorage.setItem("rebuttalDraftComment", comment);
    navigate("/tag-setup", {
      state: {
        flow: "taskrebuttal_edit",
        postId: post?.id,
        familyId: post?.family,
      },
    });
  };

  const handleSend = async () => {
    if (!comment.trim()) { setError("Please add a comment explaining your rebuttal."); return; }
    if (!post?.id) return;
    setSending(true);
    setError("");
    try {
      // Create a comment with the rebuttal + proposed tags
      await apiFetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        body: {
          content: comment,
          proposed_tag_ids: selectedTagIds,
        },
      });

      // Mark post as Contested
      await apiFetch(`/api/posts/${post.id}`, {
        method: "PUT",
        body: { status: "Contested" },
      });

      // Navigate to rebuttals view
      navigate("/taskrebuttals", { state: { post: { ...post, status: "Contested" } } });
    } catch (e) {
      console.error(e);
      setError(e.data?.error || "Failed to send rebuttal");
    } finally {
      setSending(false);
    }
  };

  if (!post) { navigate(-1); return null; }

  const photoUrl = post.photo?.[0]?.url;
  const avatarUrl = post.author_avatar?.[0]?.url;

  return (
    <div
      className="flex flex-col gap-4 px-[16px] pt-12 pb-28"
      style={{ background: "var(--color-bg)", minHeight: "100vh" }}
    >
      <h1 className="text-center">Task Rebuttal</h1>

      {/* Post Info */}
      <div className="flex items-start">
        <div className="flex-1 min-w-0">
          <div className="px-[16px] py-[8px]">
            <div className="flex gap-[16px] items-center">
              {avatarUrl ? (
                <img src={avatarUrl} className="w-[40px] h-[40px] rounded-full object-cover flex-shrink-0" alt="pfp" />
              ) : (
                <div className="w-[40px] h-[40px] rounded-full bg-gray-200 flex-shrink-0" />
              )}
              <span className="nbold">{post.author_name || "Unknown"}</span>
            </div>
          </div>
          <small className="px-[16px]">{timeAgo(post.created_time)}</small>

          {/* Competitive tags on the post */}
          {Array.isArray(post.competitiveTags) && post.competitiveTags.length > 0 && (
            <div className="flex gap-[8px] py-[8px] px-[16px] min-w-0">
              <span className="nbold flex-shrink-0">Tags</span>
              <div className="flex items-center gap-[8px] overflow-x-auto scroll-container">
                {post.competitiveTags.map((tag, i) => (
                  <span key={i} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
          <div className="px-[16px]">
            <span className="nbold">Task Completed: </span>
            <span>{post.title}</span>
          </div>
        </div>
        {photoUrl && (
          <img className="w-[120px] h-[120px] object-cover rounded-[20px] flex-shrink-0 bg-gray-200" src={photoUrl} alt="task" />
        )}
      </div>

      {/* Proposed Tags card */}
      <div className="bg-white rounded-[20px] p-4 flex items-center gap-3">
        <span className="nbold flex-1">
          Proposed Tags
          {selectedTagNames.length > 0 && (
            <span className="text-xs text-gray-400 ml-2 font-normal">{selectedTagNames.join(", ")}</span>
          )}
        </span>
        <button
          className="buttonS"
          style={{ background: "var(--color-dark, #1a1a2e)", color: "#fff", borderRadius: "999px" }}
          onClick={handleEditTags}
        >
          Edit
        </button>
      </div>

      {/* Comment input */}
      <div className="bg-white rounded-[20px] p-4">
        <textarea
          className="w-full resize-none outline-none ntype"
          style={{ background: "transparent", border: "none", minHeight: "120px" }}
          placeholder="Add Comment explaining why this is wrong…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <small style={{ color: "var(--color-dark-gray, #888)" }}>
        Sending a rebuttal will mark this post as Contested. The majority of active members must vote Verified within 48 hours, or the post will be automatically rejected.
      </small>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="absolute bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px]">
        <button className="button alt" onClick={() => navigate(-1)}>Cancel</button>
        <button className="button default" onClick={handleSend} disabled={sending}>
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}