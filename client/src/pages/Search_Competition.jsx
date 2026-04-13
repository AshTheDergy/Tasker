import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "../context/UserContext";

import { apiFetch } from "../lib/api";

// User Row
function UserRow({ user, status, onInvite, loading }) {
  const avatarUrl = user.avatar?.[0]?.url;

  return (
    <div className="bg-white p-[16px]">
      <div className="flex gap-[16px] justify-between items-center">
        <div className="flex gap-[16px] min-w-0">
          {avatarUrl ? (
            <img src={avatarUrl} className="w-[40px] h-[40px] rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-[40px] h-[40px] rounded-full bg-gray-200 flex-shrink-0" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="nbold truncate">{user.display_name || user.username}</span>
            <span className="xs">@{user.username}</span>
          </div>
        </div>

        {status === "member" ? (
          <span className="buttonM light flex-shrink-0 opacity-50 cursor-default">In group</span>
        ) : status === "invited" ? (
          <span className="buttonM light flex-shrink-0 opacity-50 cursor-default">Invited</span>
        ) : (
          <button
            disabled={loading}
            onClick={() => onInvite(user)}
            className="buttonM light flex-shrink-0"
          >
            Invite
          </button>
        )}
      </div>
    </div>
  );
}

// Main Page
export default function SearchComp() {
  const navigate                    = useNavigate();
  const [searchParams]              = useSearchParams();
  const familyId                    = searchParams.get("family");
  const { user }                    = useUser();

  const [query,       setQuery]     = useState("");
  const [allUsers,    setAllUsers]  = useState([]);
  const [members,     setMembers]   = useState([]);
  const [invited,     setInvited]   = useState([]);
  const [fetching,    setFetching]  = useState(true);
  const [mutating,    setMutating]  = useState(false);
  const [error,       setError]     = useState("");

  useEffect(() => {
    if (!familyId) return;
    Promise.all([
      apiFetch("/api/users"),
      apiFetch(`/api/families/${familyId}/members`),
    ])
      .then(([users, memberData]) => {
        setAllUsers(users);
        setMembers(memberData.map(m => m.username));
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [familyId]);

  const visible = allUsers.filter(u => {
    if (u.id === user?.id) return false;
    const q = query.replace(/^@/, "").toLowerCase();
    return !q
      || u.username.toLowerCase().includes(q)
      || u.display_name?.toLowerCase().includes(q);
  });

  const getStatus = (u) => {
    if (members.includes(u.username)) return "member";
    if (invited.includes(u.username)) return "invited";
    return "none";
  };

  const handleInvite = async (targetUser) => {
    setError("");
    setMutating(true);
    try {
      await apiFetch(`/api/families/${familyId}/members`, {
        method: "POST",
        body: { username: targetUser.username },
      });
      setInvited(prev => [...prev, targetUser.username]);
      setMembers(prev => [...prev, targetUser.username]);
    } catch (e) {
      setError(e?.status === 404 ? "User not found" : "Something went wrong");
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="h-full bg-bg flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-[32px] pt-12 pb-[12px]">
        <button
          className="flex justify-center w-[30px] h-[30px]"
          onClick={() => navigate(-1)}
        >
          <img className="py-[7.5px]" src="src/assets/icons/chevron.svg" />
        </button>
        <h1>Invite Competitors</h1>
        <div className="w-8" />
      </div>

      {/* Search */}
      <div className="px-[16px] pb-[16px]">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for @handle"
          className="w-full bg-white rounded-2xl px-4 py-4"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm px-[4px] pt-[8px]">{error}</p>}
      </div>

      {/* List */}
      <div className="bg-white w-full h-full rounded-t-[20px] overflow-y-auto">
        {fetching ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No users found</p>
        ) : (
          visible.map(u => (
            <UserRow
              key={u.id}
              user={u}
              status={getStatus(u)}
              onInvite={handleInvite}
              loading={mutating}
            />
          ))
        )}
      </div>

    </div>
  );
}