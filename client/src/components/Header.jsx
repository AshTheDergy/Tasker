import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { extractMediaUrl } from "../lib/utils";

export default function Header({ onNotifications }) {
  const navigate = useNavigate();
  const { user } = useUser();

  const avatarUrl = extractMediaUrl(user?.avatar);

  return (
    <header className="sticky top-0 z-40 bg-bg px-5 pb-4 box-content">
      <div className="pt-[40px] flex items-center">
        <img
          src={avatarUrl || "src/assets/misc/no-profile.png"}
          alt="avatar"
          onClick={() => navigate("/profile")}
          className="w-[40px] h-[40px] rounded-full object-cover flex-shrink-0 cursor-pointer"
        />
        <div className="flex items-center gap-1 ml-[30.25px]">
          <img src="src/assets/icons/streak.svg" width={20} height={20} />
          <span className="nbold">{user?.streak ?? "—"}</span>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2">
          <img onClick={() => navigate("/onboarding")} src="src/assets/Tasker_logo.svg" width={35} height={35} />
        </div>
        <div className="flex-1" />
        <button
          onClick={onNotifications}
          className="text-gray-600 hover:text-gray-900 active:scale-95 transition-transform flex-shrink-0"
          aria-label="Notifications"
        >
          <img src="src/assets/icons/bell.svg" width={30} height={30} />
        </button>
      </div>
    </header>
  );
}