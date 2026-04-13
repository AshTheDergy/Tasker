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

export default function TaskRebuttals() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useUser();

  const post = state?.post;

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tagsMap, setTagsMap] = useState({});

  useEffect(() => {
    if (!post?.id) return;
    Promise.all([
      apiFetch(`/api/posts/${post.id}/comments`),
      post.family ? apiFetch(`/api/families/${post.family}/tags`) : Promise.resolve([]),
    ])
      .then(([commentsData, tagsData]) => {
        setComments(commentsData);
        const map = {};
        tagsData.forEach(t => { map[t.id] = t; });
        setTagsMap(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [post?.id]);

  const handleRebut = () => {
    navigate("/taskrebuttal", { state: { post } });
  };

  const handleAcceptChanges = (comment) => {
    // Navigate to tag_setup in accept_task_rebuttal flow, pre-loading proposed tags
    const proposedTagIds = comment.proposed_tag_ids || [];
    const proposedTagNames = proposedTagIds.map(id => tagsMap[id]?.name || id);
    navigate("/tag-setup", {
      state: {
        flow: "accept_task_rebuttal",
        postId: post?.id,
        familyId: post?.family,
        rebuttalTags: proposedTagIds.map(id => ({
          id,
          name: tagsMap[id]?.name || id,
          points_value: tagsMap[id]?.points_value || 0,
          color: tagsMap[id]?.color,
        })),
      },
    });
  };

  if (!post) { navigate(-1); return null; }

  const photoUrl = post.photo?.[0]?.url;
  const avatarUrl = post.author_avatar?.[0]?.url;
  const isOwn = post.author === user?.id;

  return (
    <div className="flex flex-col gap-4 px-[16px] pt-12 pb-28" style={{ background: "var(--color-bg)" }}>
      <h1 className="text-center">Task Rebuttals</h1>

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

          {/* Tags on the post */}
          {(post.tags || []).length > 0 && (
            <div className="flex gap-[8px] py-[8px] px-[16px] min-w-0">
              <span className="nbold flex-shrink-0">Tags</span>
              <div className="flex items-center gap-[8px] overflow-x-auto parent-container scroll-container">
                {post.tags.map(tagId => (
                  <span key={tagId} className="tag">{tagsMap[tagId]?.name || tagId}</span>
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

      {/* Rebuttal entries */}
      <div className="flex flex-col gap-4">
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No rebuttals yet.</p>
        ) : (
          comments.map(comment => {
            const hasProposedTags = comment.proposed_tag_ids?.length > 0;
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
                  <span className="nbold">{hasProposedTags ? "Revised Tags" : "Tags Unchanged"}</span>
                  {hasProposedTags && (
                    <>
                      <button className="buttonS" onClick={() => {
                        // Show proposed tags inline as pills
                      }}>
                        View
                      </button>
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

                {hasProposedTags && (
                  <div className="flex flex-wrap gap-2">
                    {comment.proposed_tag_ids.map(tagId => (
                      <span key={tagId} className="tag">{tagsMap[tagId]?.name || tagId}</span>
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