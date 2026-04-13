// NOT IDEAL, WILL BE WORKED ON

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../lib/api";

function ConfirmDialog({ message, subtext, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 flex flex-col gap-[16px] shadow-xl">
        <div className="flex flex-col gap-[6px] text-center">
          <p className="nbold text-[17px]">{message}</p>
          {subtext && <p className="text-sm text-gray-400">{subtext}</p>}
        </div>
        <div className="flex flex-col gap-[8px]">
          <button className="w-full py-3 rounded-2xl bg-red-500 text-white font-semibold active:scale-95 transition-transform" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold active:scale-95 transition-transform" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FamilySettingsScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const familyId = searchParams.get("family");
  const { user } = useUser();

  const [familyName, setFamilyName] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [members, setMembers] = useState([]);
  const [myRole, setMyRole] = useState("Member");
  const [canInvite, setCanInvite] = useState("Everyone");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = myRole === "Owner";
  const isAdmin = myRole === "Admin" || isOwner;
  const canSendInvite = isAdmin || canInvite === "Everyone";

  useEffect(() => {
    if (!familyId || !user?.id) return;
    Promise.all([
      apiFetch(`/api/families/${familyId}`),
      apiFetch(`/api/families/${familyId}/members`),
    ])
      .then(([familyData, membersData]) => {
        setFamilyName(familyData.name);
        setOriginalName(familyData.name);
        setCanInvite(familyData.can_invite ?? "Everyone");
        setMembers(membersData);
        const mine = membersData.find(m => m.username === user.username);
        if (mine) setMyRole(mine.role);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [familyId, user?.id]);

  useEffect(() => {
    const close = () => setActiveMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleSave = async () => {
    if (!familyId || !isAdmin) return;
    setSaving(true);
    try {
      await apiFetch(`/api/families/${familyId}`, {
        method: "PUT",
        body: { name: familyName },
      });
      window.location.replace("/competition");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    setShowDeleteConfirm(false);
    try {
      await apiFetch(`/api/families/${familyId}`, { method: "DELETE" });
      window.location.replace("/competition");
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!isAdmin) return;
    if (member.username === user.username) return;
    if (myRole === "Admin" && member.role !== "Member") return;
    try {
      await apiFetch(`/api/memberships/${member.id}`, { method: "DELETE" });
      setMembers(prev => prev.filter(m => m.id !== member.id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = async () => {
    if (!isAdmin) return;
    const username = addInput.replace(/^@/, "").trim();
    if (!username) return;
    setAddError("");
    try {
      const { id } = await apiFetch(`/api/families/${familyId}/members`, {
        method: "POST",
        body: { username },
      });
      setMembers(prev => [...prev, { id, username, display_name: username, avatar: [], points: 0, role: "Member" }]);
      setAddInput("");
      setShowAddInput(false);
    } catch (e) {
      if (e.status === 404) setAddError("User not found");
      else setAddError(e.data?.error || "Something went wrong");
    }
  };

  const changeRole = async (member, role) => {
    try {
      await apiFetch(`/api/memberships/${member.id}/role`, { method: "PUT", body: { role } });
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role } : m));
      setActiveMenu(null);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCanInvite = async () => {
    if (!isOwner) return;
    const next = canInvite === "Everyone" ? "Admin Only" : "Everyone";
    try {
      await apiFetch(`/api/families/${familyId}`, { method: "PUT", body: { can_invite: next } });
      setCanInvite(next);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareInvite = async () => {
    setLinkLoading(true);
    try {
      const data = await apiFetch(`/api/families/${familyId}/invite-link`, {
        method: "POST",
        body: { created_by: user.id },
      });
      const link = data.invite_url;
      if (navigator.share) {
        await navigator.share({ title: "Join my competition!", url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      }
    } catch (e) {
      console.error("Invite error:", e);
    } finally {
      setLinkLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-bg flex flex-col items-center justify-center">
        <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-full bg-bg flex flex-col">
      {showDeleteConfirm && (
        <ConfirmDialog
          message="Delete this competition?"
          subtext="This cannot be undone. All members and data will be removed."
          confirmLabel="Delete Competition"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <div className="flex items-center gap-[22px] px-[32px] pt-12 pb-[12px]">
        {isOwner ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="text-gray-400 hover:text-red-500 transition-colors active:scale-90">
            <img src="src/assets/icons/trash.png" />
          </button>
        ) : (
          <div className="w-[24px]" />
        )}
        <h1>Competition Settings</h1>
      </div>

      {!isAdmin && (
        <p className="text-xs text-gray-400 text-center pb-[8px]">You're a member — only admins can make changes.</p>
      )}

      <div className="flex flex-col px-[16px] gap-[16px] overflow-y-auto pb-28">
        <input
          type="text"
          placeholder="Competition name"
          value={familyName}
          onChange={(e) => isAdmin && setFamilyName(e.target.value)}
          readOnly={!isAdmin}
          className={`w-full bg-white rounded-2xl px-4 py-4 ${!isAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
        />

        {/* Edit Tags — navigates to tag-setup in edit_tags flow */}
        <button
          className="w-full bg-white rounded-2xl px-4 py-4 flex items-center justify-between"
          onClick={() => navigate(`/tag-setup?flow=edit_tags&family=${familyId}`, {
            state: { flow: "edit_tags", familyId },
          })}
          disabled={!isAdmin}
        >
          <span className="nbold">Edit Tags</span>
          <img src="src/assets/icons/schevron.svg" />
        </button>

        <h1 className="px-[4px]">Competitors</h1>

        <div className="bg-white rounded-2xl p-[16px] flex flex-col gap-[12px] h-[225px] overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No competitors yet</p>
          ) : (
            members.map(member => {
              const avatarUrl = member.avatar?.[0]?.url;
              const isMe = member.username === user?.username;
              return (
                <div className="flex gap-[16px] items-center relative" key={member.id}>
                  {avatarUrl ? (
                    <img src={avatarUrl} className="w-[40px] h-[40px] rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-[40px] h-[40px] rounded-full bg-gray-200 flex-shrink-0" />
                  )}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="nbold truncate">
                      {member.display_name || member.username}
                      {isMe && <span className="text-gray-400 font-normal"> (you)</span>}
                    </span>
                    <span className="xs text-gray-400">@{member.username} · {member.points} Pts · {member.role}</span>
                  </div>

                  {isAdmin && !isMe && (
                    <>
                      <button className="image-button" onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(prev => prev === member.id ? null : member.id);
                      }}>
                        <img className="w-[40px]" src="src/assets/icons/dots.svg" />
                      </button>
                      {activeMenu === member.id && (
                        <div className="absolute right-0 top-[50px] bg-white rounded-xl shadow-lg z-50 flex flex-col min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                          {(member.role === "Member" || (isOwner && member.role === "Admin")) && (
                            <button className="px-4 py-2 text-left hover:bg-gray-100 text-red-500"
                              onClick={() => { handleRemoveMember(member); setActiveMenu(null); }}>
                              Remove
                            </button>
                          )}
                          {isOwner && member.role === "Member" && (
                            <button className="px-4 py-2 text-left hover:bg-gray-100" onClick={() => changeRole(member, "Admin")}>
                              Make Admin
                            </button>
                          )}
                          {isOwner && member.role === "Admin" && (
                            <button className="px-4 py-2 text-left hover:bg-gray-100" onClick={() => changeRole(member, "Member")}>
                              Remove Admin
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="bg-white rounded-2xl px-4 py-4 flex items-center justify-between">
          <span className="nbold">Can Invite</span>
          <button onClick={toggleCanInvite} disabled={!isOwner}
            className={`text-sm font-medium px-4 py-1.5 rounded-full transition-colors ${
              canInvite === "Everyone" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
            } ${!isOwner ? "cursor-default" : ""}`}>
            {canInvite}
          </button>
        </div>

        {canSendInvite && (
          <div className="flex items-center justify-center gap-[16px]">
            <button className="bg-white rounded-2xl px-6 py-3 nbold" onClick={() => navigate(`/searchcomp?family=${familyId}`)}>
              Send Invite
            </button>
            <button
              className="w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center active:scale-90 transition-transform"
              onClick={handleShareInvite}
              disabled={linkLoading}
            >
              {linkLoading ? <span className="text-xs text-gray-400">…</span> : <img src="src/assets/icons/share.svg" className="w-[22px] h-[22px]" />}
            </button>
          </div>
        )}

        {linkCopied && <p className="text-xs text-center text-primary animate-pulse">Invite link copied!</p>}
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px]">
        <button className="button alt" onClick={() => navigate("/competition")}>Cancel</button>
        {isAdmin && (
          <button className="button default" onClick={handleSave} disabled={saving || familyName === originalName}>
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}