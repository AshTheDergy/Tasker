// NOT IDEAL, WILL BE WORKED ON

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
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

// Leaderboard Row
function LeaderboardRow({ rank, member }) {
  return (
    <div className="flex items-center gap-[16px] px-[16px] py-[8px] border-b border-dark-gray last:border-0">
      <div className="flex items-center gap-[8px]">
        <span className="w-5 nbold text-center">{rank}</span>
        {member.avatar?.[0]?.url ? (
          <img src={member.avatar[0].url} className="w-[40px] h-[40px] rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-[40px] h-[40px] rounded-full bg-gray-200 flex-shrink-0" />
        )}
      </div>
      <span className="flex-1 nbold truncate">{member.display_name}</span>
      <h1>{member.points} Pts</h1>
    </div>
  );
}

// Update Row
function UpdateRow({ post }) {
  const status = post.status;
  const isPending   = status === "Pending";
  const isContested = status === "Contested";
  const showLine    = isPending || isContested;
  const lineColor   = isContested ? "#FF676A" : "#9360FF";

  const avatarUrl = post.author_avatar?.[0]?.url;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div
        className="w-[5px] h-[25px] rounded-[5px] flex-shrink-0"
        style={{ backgroundColor: showLine ? lineColor : "transparent" }}
      />
      {avatarUrl ? (
        <img src={avatarUrl} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="nbold truncate block">{post.author_name || "Unknown"}</span>
        <small className="text-gray-400">{timeAgo(post.created_time)}</small>
      </div>
      <small className="text-right truncate max-w-[100px] flex-shrink-0">
        {post.title}
      </small>
    </div>
  );
}

// Family Card
function FamilyCard({ family, members, posts, loading, onSettings, onOpenFeed }) {
  return (
    <div className="flex flex-col gap-[8px] pt-[16px]">
      <div className="px-[16px] flex items-center justify-between">
        <span className="xl">{family.name}</span>
        <button
          onClick={() => onSettings(family.id)}
          className="flex items-center justify-center h-[40px] w-[40px] bg-white rounded-full"
        >
          <Settings size={24} />
        </button>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl overflow-y-auto p-[16px] w-[361px] h-[225px]">
        {loading ? (
          <div className="space-y-3 py-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No members yet</p>
        ) : (
          members.map((member, i) => (
            <LeaderboardRow key={member.id} rank={i + 1} member={member} />
          ))
        )}
      </div>

      {/* Latest Updates */}
      <div className="px-[16px] flex items-center justify-between">
        <h1>Latest Updates</h1>
        <button onClick={() => onOpenFeed(family.id)} className="buttonS">
          Open Feed
        </button>
      </div>
      <div className="bg-white rounded-[20px] px-4 overflow-y-auto w-[361px] h-[225px]">
        {loading ? (
          <div className="space-y-3 py-3">
            {[1, 2].map(i => (
              <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No updates yet</p>
        ) : (
          posts.map(post => <UpdateRow key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}

// Main Page
export default function Competition() {
  const navigate          = useNavigate();
  const { user }          = useUser();
  const [families,  setFamilies]  = useState([]);
  const [membersMap, setMembersMap] = useState({});
  const [postsMap,   setPostsMap]   = useState({});
  const [current,   setCurrent]   = useState(0);
  const [loading,   setLoading]   = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    apiFetch(`/api/users/${user.id}/competition`)
      .then(({ families: data }) => {
        setFamilies(data);
        const mMap = {}, pMap = {};
        data.forEach(f => {
          mMap[f.id] = f.members;
          pMap[f.id] = f.posts;
        });
        setMembersMap(mMap);
        setPostsMap(pMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!scrollRef.current || families.length === 0) return;
    const sections = scrollRef.current.querySelectorAll("section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = [...sections].indexOf(entry.target);
            if (idx !== -1) setCurrent(idx);
          }
        });
      },
      { root: scrollRef.current, threshold: 0.5 }
    );
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [families]);

  const scrollToIndex = (i) => {
    const el = scrollRef.current;
    if (!el) return;
    el.querySelectorAll("section")[i]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const handleSettings = (familyId) => navigate(`/compsettings?family=${familyId}`);
  const handleOpenFeed = (familyId) => navigate(`/feed?family=${familyId}`);

  return (
    <div className="h-full bg-bg flex flex-col">
      <Header />

      <div ref={scrollRef} className="flex gap-[8px] overflow-x-auto snap-x snap-mandatory px-[16px]">
        {loading ? (
          <section className="snap-center shrink-0 w-full">
            <div className="space-y-4 pt-2">
              <div className="h-8 w-32 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-48 bg-white rounded-2xl animate-pulse" />
            </div>
          </section>
        ) : families.length === 0 ? (
          <section className="snap-center shrink-0 w-full flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-gray-400 text-sm">You're not in any competitions yet.</p>
            <button
              onClick={() => navigate("/compsetup")}
              className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full active:scale-95 transition-transform"
            >
              Create Competition
            </button>
          </section>
        ) : (
          families.map((family) => (
            <section key={family.id} className="snap-center snap-always shrink-0 w-full">
              <FamilyCard
                family={family}
                members={membersMap[family.id] || []}
                posts={postsMap[family.id] || []}
                loading={false}
                onSettings={handleSettings}
                onOpenFeed={handleOpenFeed}
              />
            </section>
          ))
        )}
      </div>

      {families.length > 0 && (
        <div className="flex justify-center items-center gap-[16px] pt-[16px]">
          <div className="flex gap-2">
            {families.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? "bg-gray-900" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
          <button onClick={() => navigate("/compsetup")} className="buttonS white">
            Create Competition
          </button>
        </div>
      )}
    </div>
  );
}