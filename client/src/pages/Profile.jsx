// NOT IDEAL, WILL BE WORKED ON
// Since this was one of the first pages we made
// some of the systems might be outdated and break easily
// will be worked on later

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, X, MoreHorizontal, UserPlus, LogOut } from "lucide-react";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../lib/api";
import { extractMediaUrl } from "../lib/utils";

// Friend row

function FriendRow({ friendId, onMenu, activeMenu }) {
  const [friend, setFriend] = useState(null);

  useEffect(() => {
    apiFetch(`/api/users/${friendId}`).then(setFriend).catch(console.error);
  }, [friendId]);

  if (!friend) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
        <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const avatarUrl = extractMediaUrl(friend.avatar);

  return (
    <div className="flex items-center gap-3 px-4 py-3 relative">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={friend.display_name}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
      )}
      <span className="flex-1 nbold text-gray-900 truncate">
        {friend.display_name || friend.username}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMenu(activeMenu === friendId ? null : friendId);
        }}
        className="text-gray-400 hover:text-gray-700 active:scale-90 transition-transform p-1"
      >
        <MoreHorizontal size={18} />
      </button>
      {activeMenu === friendId && (
        <div className="absolute right-4 top-2 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[140px]">
          <button
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => onMenu(null)}
          >
            View Profile
          </button>
          <button
            className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
            onClick={() => onMenu(null)}
          >
            Remove Friend
          </button>
        </div>
      )}
    </div>
  );
}

// Profile screen

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const [editing, setEditing]             = useState(false);
  const [editName, setEditName]           = useState("");
  const [editPrivate, setEditPrivate]     = useState(false);
  const [saving, setSaving]               = useState(false);

  const [avatarFile, setAvatarFile]       = useState(null);
  const [bannerFile, setBannerFile]       = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const [activeMenu, setActiveMenu] = useState(null);


  const bannerUrl = bannerPreview ?? extractMediaUrl(user?.banner);
  const avatarUrl = avatarPreview ?? extractMediaUrl(user?.avatar);

  const friends = user?.friends ?? [];

  // Edit helpers

  const startEdit = () => {
    setEditName(user?.display_name ?? "");
    setEditPrivate(user?.is_private ?? false);
    setAvatarFile(null);
    setBannerFile(null);
    setAvatarPreview(null);
    setBannerPreview(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setAvatarFile(null);
    setBannerFile(null);
    setAvatarPreview(null);
    setBannerPreview(null);
  };

  const saveEdit = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const body = {
        display_name: editName.trim(),
        is_private:   editPrivate,
      };

      if (avatarFile) {
        const form = new FormData();
        form.append("file", avatarFile);
        const upload = await apiFetch("/api/upload", { body: form });
        body.avatar_url = upload.url;
      }

      if (bannerFile) {
        const form = new FormData();
        form.append("file", bannerFile);
        const upload = await apiFetch("/api/upload", { body: form });
        body.banner_url = upload.url;
      }

      await apiFetch(`/api/users/${user.id}`, { method: "PUT", body });

      setUser((prev) => ({
        ...prev,
        display_name: body.display_name,
        is_private:   body.is_private,
        ...(body.avatar_url && { avatar: [{ url: body.avatar_url }] }),
        ...(body.banner_url && { banner: [{ url: body.banner_url }] }),
      }));

      setEditing(false);
      setAvatarFile(null);
      setBannerFile(null);
      setAvatarPreview(null);
      setBannerPreview(null);
    } catch (err) {
      if (err.message?.includes("409")) {
        alert("That username is already taken.");
      } else {
        console.error("Failed to save profile:", err);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleBannerPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const logout = () => setUser(null);

  // Render

  return (
    <div
      className="h-full bg-bg flex flex-col overflow-y-auto"
      onClick={() => activeMenu && setActiveMenu(null)}
    >
      {/* BANNER + AVATAR */}
      <div className="relative flex-shrink-0">

        {/* Banner */}
        <div
          className="w-full h-[200px] bg-gradient-to-br from-pink-200 via-purple-100 to-indigo-200"
          style={
            bannerUrl
              ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : {}
          }
        >
          {editing && (
            <div className="absolute inset-0 bg-black/30 transition-opacity duration-300" />
          )}
        </div>

        {editing ? (
          <button
            onClick={cancelEdit}
            className="absolute top-[50px] left-[27px] z-10 text-white drop-shadow active:scale-90 transition-transform"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="absolute top-[50px] left-[27px] z-10 text-white drop-shadow active:scale-90 transition-transform"
          >
            <ChevronLeft size={26} strokeWidth={2.5} />
          </button>
        )}

        {/* Edit banner button */}
        {editing && (
          <>
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="absolute top-[50px] right-[27px] z-10 w-[40px] h-[40px] rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow active:scale-90 transition-transform"
            >
              <img className="w-[30px] h-[30px]" src="/src/assets/icons/edit.svg" />
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerPick}
            />
          </>
        )}

        {/* Avatar */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-[44px] z-10">
          <div className="relative">
            <img
              src={avatarUrl}
              alt="Profile"
              onError={(e) => {
                if (e.currentTarget.src !== window.location.origin + "/src/assets/misc/no-profile.png") {
                  e.currentTarget.src = "/src/assets/misc/no-profile.png";
                }
              }}
              className="w-[88px] h-[88px] rounded-[18px] object-cover border-4 border-bg shadow-md"
            />

            {editing && (
              <>
                <div className="absolute inset-0 rounded-[14px] bg-black/20" />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center active:scale-90 transition-transform"
                >
                  <img className="w-[20px] h-[20px]" src="/src/assets/icons/edit.svg" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarPick}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* NAME USERNAME */}
      <div className="mt-[60px] px-[16px]">
        {editing ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 flex flex-col gap-1.5">
                <input
                  className="row focus:outline-none focus:border-violet-400"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Display name"
                  maxLength={40}
                  autoComplete="off"
                />
                <p className="text-sm text-dark-gray px-4">@{user?.username}</p>
              </div>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="buttonS white self-start mt-0.5 disabled:opacity-50"
              >
                {saving ? "..." : "Save"}
              </button>
            </div>

            <small className="text-dark-gray text-center">Tap to edit</small>

            <div className="bg-white rounded-[20px] px-4 py-3.5 flex items-center justify-between">
              <span className="nbold text-gray-900">Private Profile</span>
              <button
                onClick={() => setEditPrivate((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  editPrivate ? "bg-violet-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    editPrivate ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-black leading-tight">
                {user?.display_name || "—"}
              </h1>
              <small className="text-dark-gray mt-0.5">
                @{user?.username || "—"}
              </small>
            </div>
            <button
              onClick={startEdit}
              className="mt-1 w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform shadow-sm"
              aria-label="Edit profile"
            >
              <img className="w-[30px] h-[30px]" src="/src/assets/icons/edit.svg" />
            </button>
          </div>
        )}
      </div>

      <div
        className={`flex flex-col transition-opacity duration-300 ${
          editing ? "opacity-30 pointer-events-none select-none" : "opacity-100"
        }`}
      >
        {/* Streak */}
        <div className="mt-6 flex flex-col items-center gap-1 px-[16px]">
          <h1>Streak</h1>
          <div className="flex items-center gap-2">
            <img src="/src/assets/icons/streak.svg" width={44} height={44} alt="streak" />
            <span className="xl">{user?.streak ?? 0}</span>
          </div>
        </div>

        {/* Friends */}
        <div className="mt-6 px-[16px] flex flex-col gap-3">
          <h1>Friends</h1>

          {friends.length > 0 ? (
            <div className="bg-white rounded-[20px] overflow-hidden divide-y divide-gray-50">
              {friends.map((friendId) => (
                <FriendRow
                  key={friendId}
                  friendId={friendId}
                  onMenu={setActiveMenu}
                  activeMenu={activeMenu}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[20px] overflow-hidden divide-y divide-gray-50">
              <p className="text-sm text-gray-400 text-center py-4">No friends yet.</p>
            </div>
          )}

          <div className="flex justify-center mt-2">
            <button
              className="buttonS white flex items-center gap-1.5"
              onClick={() => navigate("/search")}
            >
              <UserPlus size={14} />
              Add Friend
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="mt-6 flex justify-center px-[16px] pb-28">
          <button
            onClick={logout}
            className="flex items-center gap-[8px] !text-red-500 active:scale-95 transition-transform buttonM"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}