// EVERYTHING HERE IS A PLACEHOLDER

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../lib/api";

function timeAgo(isoString) {
  if (!isoString) return "";
  const diff = (Date.now() - new Date(isoString)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

// Map notification type to readable action label
function actionLabel(type) {
  switch (type) {
    case "task_updated":    return "Updated Task";
    case "task_completed":  return "Completed Task";
    case "invited":         return "Invited you to";
    case "post_rebuted":    return "Rebuted your post";
    case "post_liked":      return "Liked your post";
    case "friend_request":  return "Sent you a friend request";
    default:                return type ?? "";
  }
}

function NotifCard({ notif, onClose }) {
  const navigate = useNavigate();

  const handleClick = () => {
    onClose();
    if (notif.type === "invited" && notif.family_id) {
    navigate("/compinvite", { state: { familyId: notif.family_id } });
  } else if (notif.related_post) {
    navigate(`/post/${notif.related_post}`);
  } else if (notif.related_task) {
    navigate(`/task/${notif.related_task}`);
  } else if (notif.related_user) {
    navigate(`/profile/${notif.related_user}`);
  }
  };

  const hasFamily = notif.family_name;

  return (
    <button
      onClick={handleClick}
      className="w-full text-left bg-white rounded-[1.25rem] px-4 py-3 shadow-sm flex flex-col gap-2 active:scale-[0.98] transition-transform"
    >
      {hasFamily && (
        <div className="flex items-center gap-2">
          <span className="font-bold text-[15px] text-gray-900">{notif.family_name}</span>
          <span className="text-xs text-gray-400">{timeAgo(notif.created_time)}</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {notif.related_user_avatar ? (
          <img
            src={notif.related_user_avatar}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            alt={notif.related_user_name}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        )}

        {/* Username */}
        <span className="font-semibold text-[15px] text-gray-900 flex-1">
          {notif.related_user_name ?? "Someone"}
        </span>

        {/* Action + subject */}
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-400">{actionLabel(notif.type)}</p>
          <p className="font-bold text-[14px] text-gray-900 leading-tight">
            {notif.message}
          </p>
        </div>
      </div>

      {!hasFamily && (
        <p className="text-xs text-gray-400 ml-[52px] -mt-1">{timeAgo(notif.created_time)}</p>
      )}
    </button>
  );
}

export default function NotificationsPanel({ open, onClose }) {
  const { user } = useUser();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !user?.id) return;
    setLoading(true);
    apiFetch(`/api/users/${user.id}/notifications`)
      .then((data) => { setNotifs(data); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, [open, user?.id]);

  return (
    <>
        {/* Overlay */}
        <div
          onClick={onClose}
          className={`absolute inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
            open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Panel */}
        <div
          className={`absolute top-0 right-0 z-50 h-full w-[82%] bg-bg flex flex-col
            transition-transform duration-300 ease-in-out
            ${open ? "translate-x-0" : "opacity-0 translate-x-full"}`}
        >

        {/* Header */}
        <div className="pt-14 pb-6 px-5">
          <h1>Notifications</h1>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 flex flex-col gap-3 pb-10">
          {loading ? (
            <div className="text-center text-gray-400 mt-10">Loading...</div>
          ) : notifs.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">No notifications yet</div>
          ) : (
            notifs.map((notif) => (
              <NotifCard key={notif.id} notif={notif} onClose={onClose} />
            ))
          )}
        </div>

        {/* template */}
        <div className="flex flex-col gap-3 p-4 pb-28">

              {/* Card 1 */}
              <div className="bg-white rounded-[20px] px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h1>Family</h1>
                  <small className="text-dark-gray">2 hours ago</small>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                    <span className="nbold">Eater 4</span>
                  </div>
                  <div className="text-right">
                    <small className="text-dark-gray block">Updated Task</small>
                    <span className="nbold">Clean Room</span>
                  </div>
                </div>
              </div>

              {/* Card 2 — no competition label */}
              <div className="bg-white rounded-[20px] px-4 py-3 flex flex-col gap-2">
                <small className="text-dark-gray">2 hours ago</small>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                    <span className="nbold">Johnny245</span>
                  </div>
                  <div className="text-right">
                    <small className="text-dark-gray block">Invited you to</small>
                    <span className="nbold">Schoolmates</span>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-[20px] px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h1>Family</h1>
                  <small className="text-dark-gray">2 hours ago</small>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                    <span className="nbold">Meowl</span>
                  </div>
                  <div className="text-right">
                    <small className="text-dark-gray block">Rebuted your post</small>
                    <span className="nbold">Tag Rebuttal</span>
                  </div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-white rounded-[20px] px-4 py-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h1>Family</h1>
                  <small className="text-dark-gray">7 hours ago</small>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                    <span className="nbold">Eater 4</span>
                  </div>
                  <div className="text-right">
                    <small className="text-dark-gray block">Completed Task</small>
                    <span className="nbold">Clean Room</span>
                  </div>
                </div>
              </div>

            </div>

      </div>
    </>
  );
}