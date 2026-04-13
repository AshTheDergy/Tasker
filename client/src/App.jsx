import { Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { useState, useEffect, useRef  } from "react";
import { useUser } from "./context/UserContext";
import { useServerStatusContext } from "./context/ServerStatusContext";

import Taskbar               from "./components/Taskbar";
import NotificationsPanel    from "./components/Notifications";
import Login                 from "./pages/Login";
import HomeScreen            from "./pages/Home_Screen";
import Profile               from "./pages/Profile";
import NewTask               from "./pages/New_Task";
import Competition           from "./pages/Competition";
import EditTask              from "./pages/Edit_Task";
import SelectFolders         from "./pages/Select_Folders";
import ManageFolders         from "./pages/Manage_Folders";
import Feed                  from "./pages/Feed";
import CompSettings          from "./pages/Competition_Settings";
import Search                from "./pages/Search";
import CompInvite            from "./pages/Compinvite";
import EditPreset            from "./pages/Edit_Preset";
import JoinFamily            from "./pages/Join_Family";
import Onboarding            from "./pages/Onboarding";
import Verification          from "./pages/Verification";
import EditTags              from "./pages/Tag_Setup";
import ChangePost            from "./pages/Changepost";
import Timer                 from "./pages/Timer";
import CompSetup             from "./pages/Compsetup";
import TagRebuttal           from "./pages/Tag_Rebuttal";
import TagRebuttals          from "./pages/Tag_Rebuttals";
import TagSetup2             from "./pages/Tag_Setup2";
import TaskRebuttal          from "./pages/Task_Rebuttal";
import TaskRebuttals         from "./pages/Task_Rebuttals";
import SearchComp            from "./pages/Search_Competition";
// import SoloTags              from "./pages/SoloTags"

const HIDE_TASKBAR = new Set([
  "/login", "/onboarding", "/profile",
  "/search", "/searchcomp",
  "/compsetup", "/compsettings",
  "/newtask", "/edittask",
  "/selectfolder", "/managefolders",
  "/tag-setup", "/tagrebuttal", "/tagrebuttals", "/tagsetup2",
  "/taskrebuttal", "/editpreset",
  "/verification",
]);

function RequireAuth() {
  const { user } = useUser();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RootRedirect({ children }) {
  const [activating, setActivating] = useState(true);
  
  useEffect(() => {
    const t = setTimeout(() => setActivating(false), 200);
    return () => clearTimeout(t);
  }, []);
  
  if (activating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">Loading...</div>
      </div>
    );
  }
  return children;
}

export default function App() {
  const containerRef = useRef(null);
  const location = useLocation();
  const { user } = useUser();
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [pageClass, setPageClass] = useState("");
  const showTaskbar = !HIDE_TASKBAR.has(location.pathname) && !location.pathname.startsWith("/join/");

  // Firefox ratio scaling
  useEffect(() => {
    const isFirefox = navigator.userAgent.includes("Firefox");
    if (!isFirefox) return;

    const applyScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const vh = visualViewport?.height ?? window.innerHeight;
      const naturalHeight = 393 * (18 / 9);
      const scaleByWidth  = window.innerWidth / 393;
      const scaleByHeight = vh / naturalHeight;
      const scale = Math.min(scaleByWidth, scaleByHeight);

      const scaledHeight = vh / scale;

      container.style.transform       = `scale(${scale})`;
      container.style.transformOrigin = "top center";
      container.style.width           = "393px";
      container.style.height          = `${scaledHeight}px`;
    };

    applyScale();
    visualViewport?.addEventListener("resize", applyScale);
    window.addEventListener("resize", applyScale);
    return () => {
      visualViewport?.removeEventListener("resize", applyScale);
      window.removeEventListener("resize", applyScale);
    };
  }, []);
  
  //Online check and server check
  const { isOnline, isServerUp } = useServerStatusContext();
  const showBanner = !isOnline || !isServerUp;
  const bannerText = !isOnline
    ? "No internet connection — changes won't save until you're back online."
    : "Server is unreachable — we'll try to reconnect automatically.";


  return (
    <>      
      <div ref={containerRef} className={`relative app-container ${pageClass}`}>

        {showBanner && (
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            zIndex: 9999,
            background: "#FAEEDA",
            borderBottom: "0.5px solid #FAC775",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <div style={{
              width: 8, height: 8,
              borderRadius: "50%",
              background: "#BA7517",
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: "#854F0B", fontWeight: 500 }}>
              {bannerText}
            </span>
          </div>
        )}

        <div className="w-full flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ scrollbarWidth: "none" }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/join/:token" element={<JoinFamily />} />
            
            <Route 
              path="/" 
              element={
                <RootRedirect>
                  {user ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />}
                </RootRedirect>
              } 
            />
            
            <Route element={<RequireAuth />}>
              <Route path="/home"         element={<HomeScreen onNotifications={() => setNotifsOpen(true)} />} />
              <Route path="/newtask"      element={<NewTask />} />
              <Route path="/profile"      element={<Profile />} />
              <Route path="/competition"  element={<Competition />} />
              <Route path="/feed"         element={<Feed />} />
              <Route path="/edittask"     element={<EditTask />} />
              <Route path="/managefolders" element={<ManageFolders />} />
              <Route path="/selectfolder" element={<SelectFolders />} />
              <Route path="/changepost"   element={<ChangePost />} />
              <Route path="/compsettings" element={<CompSettings />} />
              <Route path="/compinvite"   element={<CompInvite />} />
              <Route path="/search"       element={<Search />} />
              <Route path="/searchcomp"   element={<SearchComp />} />
              <Route path="/tag-setup"    element={<EditTags />} />
              {/* <Route path="/solotags"     element={<SoloTags />} /> */}
              <Route path="/tagrebuttal"  element={<TagRebuttal />} />
              <Route path="/tagrebuttals" element={<TagRebuttals />} />
              <Route path="/tagsetup2"    element={<TagSetup2 />} />
              <Route path="/taskrebuttal" element={<TaskRebuttal />} />
              <Route path="/taskrebuttals" element={<TaskRebuttals />} />
              <Route path="/timer"        element={<Timer />} />
              <Route path="/editpreset"   element={<EditPreset />} />
              <Route path="/compsetup"    element={<CompSetup />} />
              <Route path="/onboarding"   element={<Onboarding />} />
              <Route path="/verification" element={<Verification />} />
            </Route>
          </Routes>
        </div>
        {showTaskbar && <Taskbar page={location.pathname} />}
        <NotificationsPanel open={notifsOpen} onClose={() => setNotifsOpen(false)} />
      </div>
    </>
  );
}
