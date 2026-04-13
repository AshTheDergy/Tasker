// NOT IDEAL, WILL BE WORKED ON

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../lib/api";

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

const STATUS_COLOR = {
  Pending: "text-primary",
  Verified: "text-green-500",
  Resolved: "text-green-500",
  Contested: "text-red-400",
};

// Posts store competitive_tag_ids in description
function parsePostTagIds(description) {
  if (!description || typeof description !== "string") return [];
  try {
    const parsed = JSON.parse(description);
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.competitive_tag_ids) return parsed.competitive_tag_ids;
    if (parsed?.labels) return parsed.labels;
    return [];
  } catch {
    return [];
  }
}

function AvatarGroup({ avatars, totalUsers }) {
  const displayAvatars = avatars?.slice(0, 2) || [];
  const remaining = totalUsers > 2 ? totalUsers - 2 : 0;
  return (
    <div className="flex items-center relative">
      {displayAvatars.map((avatar, idx) => (
        <div key={idx}
          className={`w-[40px] h-[40px] rounded-full flex-shrink-0 border-2 border-white overflow-hidden ${idx > 0 ? "-ml-[12px]" : ""}`}
          style={{ zIndex: displayAvatars.length - idx }}>
          {avatar?.url ? (
            <img src={avatar.url} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full bg-gray-200" />
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-[40px] h-[40px] rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold -ml-[12px] border-2 border-white" style={{ zIndex: 0 }}>
          +{remaining}
        </div>
      )}
    </div>
  );
}

function Post({ post, currentUserId, tagsMap, onVote, userVote, onOpenComments, onRebut }) {
  const isOwn = post.author === currentUserId;
  const photoUrl = post.photo?.[0]?.url;
  const isTagProposal = post.type === "Tag Proposal";
  const isTaskPost = post.type === "Task Completed";
  const avatarUrl = post.author_avatar?.[0]?.url;

  // Competitive tags directly linked via Related Tag field
  const directTags = (post.tags || []).map(id => tagsMap[id]).filter(Boolean);

  // Tags encoded in description (Task Completed posts)
  const descTagIds = isTaskPost ? parsePostTagIds(post.description) : [];
  const descTags = descTagIds
    .map(id => tagsMap[id])
    .filter(Boolean);

  // For tag proposals, tags may be encoded in description right now
  let proposalTags = [];
  if (isTagProposal) {
    try {
      const parsed = JSON.parse(post.description || "{}");
      proposalTags = parsed.tags || [];
    } catch { }
  }

  const displayTags = directTags.length > 0 ? directTags : descTags;

  return (
    <div className="w-full bg-white">
      {/* Author row */}
      <div className="p-[16px]">
        <div className="flex gap-[16px] items-center">
          {avatarUrl ? (
            <img src={avatarUrl} className="w-[40px] h-[40px] rounded-full object-cover flex-shrink-0" alt="" />
          ) : (
            <div className="w-[40px] h-[40px] rounded-full bg-gray-200 flex-shrink-0" />
          )}
          <span className="nbold w-full">{post.author_name || post.author_username}</span>
          {isOwn && (
            <button><img className="w-[40px] h-auto" src="src/assets/icons/dots.svg" alt="options" /></button>
          )}
        </div>
      </div>

      {/* Timestamp + status */}
      <small className="px-[16px] pb-[8px] block">
        {timeAgo(post.created_time)} •{" "}
        <small className={STATUS_COLOR[post.status] || "text-primary"}>{post.status}</small>
      </small>

      {/* Tag proposal: show proposed tags + points */}
      {isTagProposal ? (
        <div className="postimg overflow-y-auto">
          <div className="p-[16px] flex flex-col gap-[24px]">
            {proposalTags.length > 0 ? (
              proposalTags.map((tag, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="Btag" style={{ backgroundColor: tag.color || "#7C3AED" }}>
                    <span style={{ color: "white", fontFamily: "inter", fontSize: "15px", fontWeight: "bold" }}>
                      {tag.name}
                    </span>
                  </span>
                  <span className="buttonM light">{tag.points_value} Pts</span>
                </div>
              ))
            ) : displayTags.length > 0 ? (
              displayTags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between">
                  <span className="Btag" style={{ backgroundColor: tag.color || "#7C3AED" }}>
                    <span style={{ color: "white", fontFamily: "inter", fontSize: "15px", fontWeight: "bold" }}>
                      {tag.name}
                    </span>
                  </span>
                  <span className="buttonM light">{tag.points_value} Pts</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center">No tags attached</p>
            )}
          </div>
        </div>
      ) : (
        photoUrl && <img src={photoUrl} alt="Verification" className="postimg" />
      )}

      {/* Type + title */}
      <div className="px-[16px] py-[8px]">
        <span className="nbold">{post.type}: </span>
        <span>{post.title}</span>
      </div>

      {/* Competitive tags */}
      {!isTagProposal && displayTags.length > 0 && (
        <div className="flex gap-[8px] py-[8px] px-[16px]">
          <span className="nbold flex-shrink-0">Tags</span>
          <div className="flex items-center gap-[8px] px-[16px] parent-container scroll-container">
            {displayTags.map(tag => (
              <span key={tag.id} className="tag">{tag.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between items-center px-[64px] py-[8px]">
        <button
          className="flex gap-[8px] justify-between items-center"
          onClick={() => onOpenComments(post)}
        >
          <img className="text-black" src="src/assets/icons/commentbutton.svg" alt="comment" />
        </button>
        <button
          disabled={isOwn}
          onClick={() => !isOwn && onRebut(post)}
          className={`flex gap-[8px] justify-between items-center ${isOwn ? "opacity-30" : userVote === "down" ? "text-red-400" : ""}`}
        >
          <span>{post.downvotes}</span>
          <img className="text-black" src="src/assets/icons/rebutbutton.svg" alt="rebut" />
        </button>
        <button
          disabled={isOwn}
          onClick={() => !isOwn && onVote(post.id, "up")}
          className={`flex gap-[8px] justify-between items-center ${isOwn ? "opacity-30" : userVote === "up" ? "text-green-500" : ""}`}
        >
          <span>{post.upvotes}</span>
          <img className="text-black" src="src/assets/icons/checkbutton.svg" alt="verify" />
        </button>
      </div>
    </div>
  );
}

export default function Feed() {
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const navigate = useNavigate();
  const [userVotes, setUserVotes] = useState({});
  const [families, setFamilies] = useState([]);
  const [activeFamily, setActiveFamily] = useState(null);
  const [posts, setPosts] = useState([]);
  const [tagsMap, setTagsMap] = useState({});
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    if (!user?.families?.length) { setLoadingFamilies(false); return; }
    Promise.all(user.families.map(id => apiFetch(`/api/families/${id}`)))
      .then(data => {
        const valid = data.filter(Boolean);
        setFamilies(valid);
        const paramId = searchParams.get("family");
        const initial = valid.find(f => f.id === paramId) || valid[0];
        if (initial) setActiveFamily(initial.id);
      })
      .catch(console.error)
      .finally(() => setLoadingFamilies(false));
  }, [user?.id]);

  useEffect(() => {
    if (!activeFamily) return;
    setUserVotes({});
    setLoadingPosts(true);
    Promise.all([
      apiFetch(`/api/families/${activeFamily}/posts`),
      apiFetch(`/api/families/${activeFamily}/tags`),
    ])
      .then(([postsData, tagsData]) => {
        postsData.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
        setPosts(postsData);
        const map = {};
        tagsData.forEach(t => { map[t.id] = t; });
        setTagsMap(map);
      })
      .catch(console.error)
      .finally(() => setLoadingPosts(false));
  }, [activeFamily]);

  const handleVote = async (postId, direction) => {
    const current = userVotes[postId] ?? null;
    let upDelta = 0, downDelta = 0;
    if (current === direction) {
      if (direction === "up") upDelta = -1;
      if (direction === "down") downDelta = -1;
    } else {
      if (direction === "up") upDelta = +1;
      if (direction === "down") downDelta = +1;
      if (current === "up") upDelta -= 1;
      if (current === "down") downDelta -= 1;
    }
    const newVote = current === direction ? null : direction;
    setUserVotes(prev => ({ ...prev, [postId]: newVote }));
    setPosts(prev => prev.map(p =>
      p.id !== postId ? p : { ...p, upvotes: p.upvotes + upDelta, downvotes: p.downvotes + downDelta }
    ));
    try {
      await apiFetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        body: { upvote_delta: upDelta, downvote_delta: downDelta },
      });
    } catch (e) { console.error(e); }
  };

  const handleOpenComments = (post) => {
    if (post.type === "Tag Proposal") {
      navigate("/tagrebuttals", { state: { post } });
    } else {
      navigate("/taskrebuttals", { state: { post } });
    }
  };

  const handleRebut = (post) => {
    if (post.type === "Tag Proposal") {
      navigate("/tagrebuttal", { state: { post } });
    } else {
      navigate("/taskrebuttal", { state: { post } });
    }
  };

  const isResolved = (p) => p.status === "Verified" || p.status === "Resolved";
  const pendingPosts = posts.filter(p => !isResolved(p));
  const verifiedPosts = posts.filter(p => isResolved(p));

  return (
    <div className="h-full bg-bg flex flex-col overflow-auto">
      <div className="flex flex-col fixed top-0 z-50 w-[393px]">
        <Header />
        <div className="bg-bg pb-[8px] w-full parent-container scroll-container flex gap-[16px] px-[64px]">
          {loadingFamilies ? (
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          ) : (
            families.map(family => (
              <button
                key={family.id}
                onClick={() => setActiveFamily(family.id)}
                className="flex flex-col items-center justify-center flex-shrink-0"
              >
                <span className={activeFamily === family.id ? "nbold" : ""}>{family.name}</span>
                {activeFamily === family.id && <div className="w-full h-[2px] bg-black" />}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col justify-center items-center gap-[32px] pt-[166px] pb-[128px]">
        {loadingPosts ? (
          <div className="space-y-4 w-full pt-4">
            {[1, 2].map(i => <div key={i} className="h-48 bg-white animate-pulse" />)}
          </div>
        ) : families.length === 0 ? (
          <p className="text-gray-400 text-sm pt-8">You're not in any competitions yet.</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-400 text-sm pt-8">No posts yet in this competition.</p>
        ) : (
          <>
            {pendingPosts.length > 0 && <h1>New Updates</h1>}
            {pendingPosts.map(post => (
              <Post
                key={post.id}
                post={post}
                currentUserId={user?.id}
                tagsMap={tagsMap}
                onVote={handleVote}
                userVote={userVotes[post.id] ?? null}
                onOpenComments={handleOpenComments}
                onRebut={handleRebut}
              />
            ))}

            {verifiedPosts.length > 0 && (
              <div className="flex flex-col items-center gap-[8px]">
                <img className="w-[30px] h-[30px]" src="/src/assets/icons/Completion.svg" alt="" />
                <span className="xl text-center">You're all caught up!</span>
                <span className="nbold text-center">Everything forward is already verified</span>
              </div>
            )}

            {verifiedPosts.map(post => (
              <Post
                key={post.id}
                post={post}
                currentUserId={user?.id}
                tagsMap={tagsMap}
                onVote={handleVote}
                userVote={userVotes[post.id] ?? null}
                onOpenComments={handleOpenComments}
                onRebut={handleRebut}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}