import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

import { apiFetch } from "../lib/api";

// Toggle 
function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        value ? "bg-primary" : "bg-dark-gray"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          value ? "translate-x-6" : ""
        }`}
      />
    </button>
  );
}

// User Row
function UserRow({ user, isFriend, onAdd, onRemove, loading }) {
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
        <button
          disabled={loading}
          onClick={() => isFriend ? onRemove(user.id) : onAdd(user.id)}
          className="buttonM light flex-shrink-0"
        >
          {isFriend ? "Remove" : "Add"}
        </button>
      </div>
    </div>
  );
}

// Main Page
export default function Search() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const [query,         setQuery]         = useState("");
  const [filterFriends, setFilterFriends] = useState(false);
  const [allUsers,      setAllUsers]      = useState([]);
  const [fetching,      setFetching]      = useState(true);
  const [mutating,      setMutating]      = useState(false);

  useEffect(() => {
    apiFetch("/api/users")
      .then(setAllUsers)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const friends = user?.friends ?? [];

  const visible = allUsers
    .filter(u => {
      if (u.id === user?.id) return false;
      if (u.is_private && !friends.includes(u.id)) return false;
      const q = query.replace(/^@/, "").toLowerCase();
      const matchesQuery = !q || u.username.toLowerCase().includes(q)
                              || u.display_name?.toLowerCase().includes(q);
      const matchesFriends = !filterFriends || friends.includes(u.id);
      return matchesQuery && matchesFriends;
    })
    .sort((a, b) => {
      const af = friends.includes(a.id);
      const bf = friends.includes(b.id);
      if (af && !bf) return -1;
      if (!af && bf) return 1;
      return 0;
    });

  const friendRows    = visible.filter(u => friends.includes(u.id));
  const nonFriendRows = visible.filter(u => !friends.includes(u.id));

  const updateFriends = async (newFriends) => {
    setMutating(true);
    try {
      await apiFetch(`/api/users/${user.id}`, {
        method: "PUT",
        body: { friends: newFriends },
      });
      setUser(prev => ({ ...prev, friends: newFriends }));
    } catch (e) {
      console.error(e);
    } finally {
      setMutating(false);
    }
  };

  const handleAdd    = (id) => updateFriends([...friends, id]);
  const handleRemove = (id) => updateFriends(friends.filter(fid => fid !== id));

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
        <h1>Search Users</h1>
        <div className="w-8" />
      </div>

      {/* Search + filter */}
      <div className="flex flex-col px-[16px] gap-[12px] pb-[16px]">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for @handle"
          className="w-full bg-white rounded-2xl px-4 py-4"
        />
        <div className="row">
          <span className="nbold">Filter Friends</span>
          <Toggle value={filterFriends} onChange={setFilterFriends} />
        </div>
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
          <>
            {/* Friends section */}
            {friendRows.length > 0 && (
              <div className="border-b border-light-gray">
                {friendRows.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isFriend={true}
                    onAdd={handleAdd}
                    onRemove={handleRemove}
                    loading={mutating}
                  />
                ))}
              </div>
            )}

            {/* Non-friends */}
            {nonFriendRows.map(u => (
              <UserRow
                key={u.id}
                user={u}
                isFriend={false}
                onAdd={handleAdd}
                onRemove={handleRemove}
                loading={mutating}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}