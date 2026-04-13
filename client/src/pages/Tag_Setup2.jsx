// Currently improvised, will be changed

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useUser } from "../context/UserContext";

function Row({ children, onClick }) {
  const base = "gap-[8px] bg-white rounded-[20px] p-[16px] flex items-center justify-between";
  return onClick ? (
    <button onClick={onClick} className={`${base} w-full text-left`}>{children}</button>
  ) : (
    <div className={base}>{children}</div>
  );
}

export default function TagSetup2() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Load pending tag changes from session (set by Tag_Setup.jsx)
  const [pendingChanges, setPendingChanges] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingTagChanges");
    if (stored) {
      const parsed = JSON.parse(stored);
      setPendingChanges(parsed);
      // Pre-fill comment with existing description if accept_rebuttal flow
      if (parsed.existingDescription) {
        setComment(parsed.existingDescription);
      }
    }
  }, []);

  const handleViewTags = () => {
    // Navigate back to tag_setup in view-only mode (same as back)
    navigate(-1);
  };

  const handleSend = async () => {
    if (!pendingChanges) { navigate(-1); return; }
    setSending(true);
    setError("");

    const { familyId, tags, originalTags, flow, postId, commentId } = pendingChanges;

    try {
      if (flow === "accept_rebuttal") {
        // Apply proposed changes and update the post with a note
        if (postId) {
          // Create new tags and update competition tags
          await _applyTagChanges(familyId, tags, originalTags);
          // Update the post status back to pending with the new comment
          await apiFetch(`/api/posts/${postId}`, {
            method: "PUT",
            body: { status: "Pending", description: comment },
          });
        }
      } else {
        // edit_tags flow → compute diff and apply, then create a Tag Proposal post
        const originalIds = new Set(originalTags.map(t => t.id));
        const currentIds = new Set(tags.map(t => t.id));

        const added = tags.filter(t => t.id.startsWith("temp_"));
        const removed = originalTags.filter(t => !currentIds.has(t.id) && !t.id.startsWith("temp_"));
        const changed = tags.filter(t => originalIds.has(t.id) && !t.id.startsWith("temp_")).filter(t => {
          const orig = originalTags.find(o => o.id === t.id);
          return orig && (orig.name !== t.name || orig.pointValue !== t.pointValue);
        });

        // Build a Tag Proposal post for the feed
        const hasChanges = added.length || removed.length || changed.length;
        if (hasChanges && familyId) {
          const uid = user?.id;
          const descLines = [
            ...added.map(t => `+ ${t.name} (${t.pointValue} pts)`),
            ...removed.map(t => `- ${t.name}`),
            ...changed.map(t => {
              const orig = originalTags.find(o => o.id === t.id);
              return `~ ${orig?.name} → ${t.name} (${t.pointValue} pts)`;
            }),
          ];

          // Store proposed changes in Comments table
          const proposalBody = {
            type: "Tag Proposal",
            status: "Contested", // tag proposals start as contested (need majority vote)
            title: `Tag changes proposed`,
            description: JSON.stringify({
              comment,
              changes: descLines,
              tags: tags.map(t => ({ name: t.name, points_value: t.pointValue, color: t.color })),
            }),
            family_id: familyId,
          };

          await apiFetch("/api/posts", {
            method: "POST",
            body: proposalBody,
          });
        }
      }

      sessionStorage.removeItem("pendingTagChanges");
      navigate(`/feed?family=${pendingChanges.familyId}`);
    } catch (e) {
      console.error("Failed to send:", e);
      setError(e.data?.error || "Failed to send changes");
    } finally {
      setSending(false);
    }
  };

  async function _applyTagChanges(familyId, tags, originalTags) {
    const originalIds = new Set(originalTags.map(t => t.id));
    const currentIds = new Set(tags.map(t => t.id));

    const deleted = originalTags.filter(t => !currentIds.has(t.id) && !t.id.startsWith("temp_"));
    for (const tag of deleted) {
      await apiFetch(`/api/families/${familyId}/tags/${tag.id}`, { method: "DELETE" });
    }

    for (const tag of tags.filter(t => t.id.startsWith("temp_"))) {
      await apiFetch(`/api/families/${familyId}/tags`, {
        method: "POST",
        body: { name: tag.name, points_value: tag.pointValue, color: tag.color || "#7C3AED" },
      });
    }

    for (const tag of tags.filter(t => originalIds.has(t.id) && !t.id.startsWith("temp_"))) {
      const orig = originalTags.find(o => o.id === tag.id);
      if (orig && (orig.name !== tag.name || orig.pointValue !== tag.pointValue)) {
        await apiFetch(`/api/families/${familyId}/tags/${tag.id}`, {
          method: "PUT",
          body: { name: tag.name, points_value: tag.pointValue },
        });
      }
    }
  }

  return (
    <div className="h-full bg-bg flex flex-col">
      <div className="flex items-center justify-center px-[32px] pt-12 pb-[12px]">
        <h1>Edit Tags</h1>
      </div>

      <div className="flex flex-col px-[16px] gap-[12px] overflow-y-auto pb-28">
        <Row onClick={handleViewTags}>
          <span className="nbold">Proposed Tag Changes</span>
          <button className="buttonS" onClick={(e) => { e.stopPropagation(); handleViewTags(); }}>
            View
          </button>
        </Row>

        <div className="bg-white rounded-[20px] p-[16px]">
          <textarea
            placeholder="Add Comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full resize-none bg-transparent outline-none ntype"
            style={{ minHeight: "120px" }}
          />
        </div>

        <small className="px-[16px] text-dark-gray">
          Changing competition tags will revoke all pending verifications and create a tag proposal post that members must vote on.
        </small>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px]">
        <button onClick={handleViewTags} className="button alt">
          Back
        </button>
        <button onClick={handleSend} disabled={sending} className="button default">
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}