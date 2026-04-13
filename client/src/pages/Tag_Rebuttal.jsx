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

function parseProposalTags(description) {
  try {
    const parsed = JSON.parse(description || "{}");
    return parsed.tags || [];
  } catch {
    return [];
  }
}

export default function TagRebuttal() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useUser();

  const post = state?.post;

  const [comment, setComment] = useState("");
  const [revisedTags, setRevisedTags] = useState([]); // [{name, points_value, color}]
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const proposedTags = post ? parseProposalTags(post.description) : [];

  // Restore revised tags if returning from Tag_Setup
  useEffect(() => {
    const stored = sessionStorage.getItem("rebuttalRevisedTags");
    if (stored) {
      setRevisedTags(JSON.parse(stored));
      sessionStorage.removeItem("rebuttalRevisedTags");
    }
    const draftComment = sessionStorage.getItem("tagRebuttalDraftComment");
    if (draftComment) {
      setComment(draftComment);
      sessionStorage.removeItem("tagRebuttalDraftComment");
    }
  }, []);

  const handleEdit = () => {
    // Go to tag_setup in edit_rebuttal flow, starting from the proposal's tags
    sessionStorage.setItem("tagRebuttalDraftComment", comment);
    navigate("/tag-setup", {
      state: {
        flow: "edit_rebuttal",
        postId: post?.id,
        familyId: post?.family,
        rebuttalTags: proposedTags.map((t, i) => ({
          id: `prop_${i}`,
          name: t.name,
          points_value: t.points_value,
          color: t.color,
        })),
      },
    });
  };

  const handleSend = async () => {
    if (!comment.trim()) { setError("Please add a comment."); return; }
    if (!post?.id) return;
    setSending(true);
    setError("");
    try {
      await apiFetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        body: {
          content: comment,
          proposed_tags: revisedTags,
        },
      });

      // Mark post as Contested
      await apiFetch(`/api/posts/${post.id}`, {
        method: "PUT",
        body: { status: "Contested" },
      });

      navigate("/tagrebuttals", { state: { post: { ...post, status: "Contested" } } });
    } catch (e) {
      console.error(e);
      setError(e.data?.error || "Failed to send rebuttal");
    } finally {
      setSending(false);
    }
  };

  if (!post) { navigate(-1); return null; }

  const avatarUrl = post.author_avatar?.[0]?.url;

  return (
    <div
      className="flex flex-col gap-4 px-[16px] pt-12 pb-28"
      style={{ background: "var(--color-bg)", minHeight: "100vh" }}
    >
      <h1 className="text-center">Tag Rebuttal</h1>

      {/* Post author info */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} className="w-[40px] h-[40px] rounded-full object-cover" alt="pfp" />
          ) : (
            <div className="w-[40px] h-[40px] rounded-full bg-gray-200" />
          )}
          <span className="nbold">{post.author_name || "Unknown"}</span>
        </div>
        <small className="text-dark-gray">{timeAgo(post.created_time)}</small>
      </div>

      {/* Proposed Tags */}
      <div className="flex items-center gap-2 px-2">
        <span className="nbold">Proposed Tags</span>
        <button className="buttonS" onClick={() => navigate("/tagrebuttals", { state: { post } })}>View</button>
      </div>

      {/* Revised Tags card */}
      <div className="row">
        <div className="flex-1">
          <span className="nbold">Revised Tags</span>
          {revisedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {revisedTags.map((t, i) => (
                <span key={i} className="tag">{t.name} ({t.points_value} pts)</span>
              ))}
            </div>
          )}
        </div>
        <button className="buttonS" onClick={handleEdit}>Edit</button>
      </div>

      {/* Comment textarea */}
      <div className="bg-white rounded-[20px] p-4">
        <textarea
          className="w-full resize-none outline-none ntype"
          style={{ background: "transparent", border: "none", minHeight: "140px" }}
          placeholder="Add Comment explaining your changes…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <small style={{ color: "var(--color-dark-gray)" }}>
        Sending a rebuttal will mark this post as Contested. Sending a second rebuttal will replace the previous one.
      </small>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px]"
        style={{ background: "var(--color-bg)" }}>
        <button className="button alt" onClick={() => navigate(-1)}>Cancel</button>
        <button className="button default" onClick={handleSend} disabled={sending}>
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}