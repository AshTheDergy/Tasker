import { useLocation, useNavigate } from "react-router-dom";

export default function Taskbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
    { path: "/home", icon: "src/assets/icons/home.svg" },
    { path: "/competition", icon: "src/assets/icons/users.svg" },
    { path: "/newtask", icon: "src/assets/icons/circleplus.svg" },
    { path: "/feed", icon: "src/assets/icons/task-list-thing.svg" },
    { path: "/timer", icon: "src/assets/icons/clock.svg" },
  ];

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50
                 flex items-center gap-1
                 rounded-[30px] px-3 py-3 bg-black"
    >
      {items.map(({ path, icon }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex items-center justify-center w-[62.8px] h-[48px] rounded-[32px]
                        transition-all duration-150 active:scale-90
                        ${active ? "bg-dark-gray" : "hover:bg-white/5"}`}
          >
            <img
              src={icon}
              width={40}
              height={40}
            />
          </button>
        );
      })}
    </div>
  );
}
