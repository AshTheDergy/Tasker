// NOT IDEAL, WILL BE WORKED ON

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../lib/api";

export default function CompSetup() {
  const navigate = useNavigate();
  const { user } = useUser();

  const [familyName, setFamilyName] = useState("");
  const [members, setMembers] = useState([]);
  const [canInvite, setCanInvite] = useState("Everyone");
  const [creating, setCreating] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [createdFamilyId, setCreatedFamilyId] = useState(null);

  const canCreate = familyName.trim().length > 0 && !creating;

  const handleAddMember = async () => {
    const username = addInput.replace(/^@/, "").trim();
    if (!username) return;
    if (members.find(m => m.username === username)) { setAddError("Already added"); return; }
    if (username === user?.username) { setAddError("That's you — you'll be added automatically"); return; }
    setAddError("");
    try {
      const data = await apiFetch(`/api/users?username=${encodeURIComponent(username)}`);
      const found = data.find(u => u.username === username);
      if (!found) { setAddError("User not found"); return; }
      setMembers(prev => [...prev, {
        username: found.username,
        display_name: found.display_name || found.username,
        avatar: found.avatar || [],
      }]);
      setAddInput("");
      setShowAddInput(false);
    } catch {
      setAddError("Something went wrong");
    }
  };

  const handleRemoveMember = (username) => setMembers(prev => prev.filter(m => m.username !== username));

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const { id: familyId } = await apiFetch("/api/families", {
        method: "POST",
        body: {
          name: familyName.trim(),
          can_invite: canInvite,
          rank_pts_spacing: 1000,
          owner_id: user.id,
        },
      });

      await Promise.allSettled(
        members.map(m => apiFetch(`/api/families/${familyId}/members`, {
          method: "POST",
          body: { username: m.username },
        }))
      );

      if (canInvite !== "Everyone") {
        await apiFetch(`/api/families/${familyId}`, {
          method: "PUT",
          body: { can_invite: canInvite },
        });
      }

      navigate("/competition")

      // Navigate to tag setup for the new competition
      // navigate(`/tag-setup?flow=compsetup&family=${familyId}`, {
      //   state: { flow: "compsetup", familyId },
      // });
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  return (
    <div className="h-full bg-bg flex flex-col">
      <div className="flex items-center justify-center px-[32px] pt-12 pb-[12px]">
        <h1>New Competition</h1>
      </div>

      <div className="flex flex-col px-[16px] gap-[16px] overflow-y-auto pb-28">
        <input
          type="text"
          placeholder="Competition name"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          className="w-full bg-white rounded-2xl px-4 py-4"
          autoFocus
        />

        {/* Set Tags */}
        <button
          className="w-full bg-white rounded-2xl px-4 py-4 flex items-center justify-between opacity-50 cursor-not-allowed"
          disabled
          title="Create the competition first — you'll be taken to set tags"
        >
          <span className="nbold">Set Tags (after creation)</span>
          <img src="src/assets/icons/schevron.svg" />
        </button>

        <h1 className="px-[4px]">Competitors</h1>

        <div className="bg-white rounded-2xl p-[16px] flex flex-col gap-[12px] h-[225px] overflow-y-auto">
          {members.length === 0 ? (
            <div className="flex py-[16px] flex-col items-center justify-center gap-[8px]">
              <img src="src/assets/icons/ghost.svg" className="w-[30px] h-[30px]" />
              <span className="xl text-center">There is no one here!</span>
              <span className="nbold text-center">Add Users To The Competition To Start Competing</span>
            </div>
          ) : (
            members.map(member => {
              const avatarUrl = member.avatar?.[0]?.url;
              return (
                <div className="flex gap-[16px] items-center" key={member.username}>
                  {avatarUrl ? (
                    <img src={avatarUrl} className="w-[40px] h-[40px] rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-[40px] h-[40px] rounded-full bg-gray-200 flex-shrink-0" />
                  )}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="nbold truncate">{member.display_name}</span>
                    <span className="xs text-gray-400">@{member.username} · Member</span>
                  </div>
                  <button
                    className="image-button text-gray-400 hover:text-red-500 transition-colors active:scale-90"
                    onClick={() => handleRemoveMember(member.username)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {showAddInput && (
          <div className="flex gap-[8px]">
            <input
              type="text"
              placeholder="@username"
              value={addInput}
              onChange={e => { setAddInput(e.target.value); setAddError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAddMember()}
              className="flex-1 bg-white rounded-2xl px-4 py-3"
              autoFocus
            />
            <button className="buttonM" onClick={handleAddMember}>Add</button>
            <button className="buttonM light" onClick={() => { setShowAddInput(false); setAddError(""); }}>Cancel</button>
          </div>
        )}
        {addError && <p className="text-red-400 text-sm px-[4px]">{addError}</p>}

        <div className="centeritem">
          <button className="action-btn-40" onClick={() => setShowAddInput(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-center gap-[16px]">
          <button className="bg-white rounded-2xl px-6 py-3 nbold opacity-50 cursor-not-allowed" disabled
            title="Create the competition first to send invites">
            Send Invite
          </button>
          <button className="w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center opacity-50 cursor-not-allowed" disabled>
            <img src="src/assets/icons/share.svg" className="w-[22px] h-[22px]" />
          </button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[16px] pb-[16px] flex gap-[16px]">
        <button className="button alt" onClick={() => navigate("/competition")}>Cancel</button>
        <button className="button default" onClick={handleCreate} disabled={!canCreate}>
          {creating ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  );
}