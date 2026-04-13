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

export default function TagRebuttals() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useUser();

  const post = state?.post;

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!post?.id) return;
    apiFetch(`/api/posts/${post.id}/comments`)
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [post?.id]);

  const proposedTags = post ? parseProposalTags(post.description) : [];
  const isOwn = post?.author === user?.id;

  const handleViewProposedTags = () => {
    navigate("/tag-setup", {
      state: {
        flow: "view_only",
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

  const handleAcceptChanges = (comment) => {
    // Navigate to tag_setup in accept_rebuttal flow
    const revisedTags = comment.proposed_tags || [];
    navigate("/tag-setup", {
      state: {
        flow: "accept_rebuttal",
        postId: post?.id,
        familyId: post?.family,
        commentId: comment.id,
        existingDescription: comment.content,
        rebuttalTags: revisedTags.map((t, i) => ({
          id: `rev_${i}`,
          name: t.name,
          points_value: t.points_value,
          color: t.color,
        })),
      },
    });
  };

  const handleRebut = () => {
    navigate("/tagrebuttal", { state: { post } });
  };

  if (!post) { navigate(-1); return null; }

  const avatarUrl = post.author_avatar?.[0]?.url;

  return (
    <div className="flex flex-col gap-4 px-[16px] pt-12 pb-28" style={{ background: "var(--color-bg)" }}>
      <h1 className="text-center">Tag Rebuttals</h1>

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
        <button className="buttonS" onClick={handleViewProposedTags}>View</button>
      </div>

      {/* Rebuttal entries */}
      <div className="flex flex-col gap-4">
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No rebuttals yet.</p>
        ) : (
          comments.map(comment => {
            const hasRevisedTags = comment.proposed_tags?.length > 0;
            const commentAvatarUrl = comment.author_avatar?.[0]?.url;
            return (
              <div key={comment.id} className="bg-white rounded-[20px] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {commentAvatarUrl ? (
                      <img src={commentAvatarUrl} className="w-10 h-10 rounded-full object-cover" alt="pfp" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                    )}
                    <span className="nbold">{comment.author_name || "Unknown"}</span>
                  </div>
                  <small className="text-dark-gray">{timeAgo(comment.created_time)}</small>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="nbold">{hasRevisedTags ? "Revised Tags" : "Tags Unchanged"}</span>
                  {hasRevisedTags && (
                    <>
                      <button className="buttonS" onClick={() => {/* inline view */}}>View</button>
                      {isOwn && (
                        <button
                          className="buttonS white"
                          style={{ background: "var(--color-light-gray)" }}
                          onClick={() => handleAcceptChanges(comment)}
                        >
                          Accept Changes
                        </button>
                      )}
                    </>
                  )}
                </div>

                {hasRevisedTags && (
                  <div className="flex flex-wrap gap-2">
                    {comment.proposed_tags.map((t, i) => (
                      <span key={i} className="tag">{t.name} ({t.points_value} pts)</span>
                    ))}
                  </div>
                )}

                <span className="ntype">{comment.content}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px]">
        <button className="button alt" onClick={() => navigate(-1)}>Cancel</button>
        {!isOwn && (
          <button className="button default" onClick={handleRebut}>Rebut</button>
        )}
      </div>
    </div>
  );
}