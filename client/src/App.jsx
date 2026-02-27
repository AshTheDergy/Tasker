import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import React from 'react'
import Taskbar from "./components/taskbar"

import HomeScreen from "./pages/HomeScreen"
import NewTask from "./pages/NewTask"
import FamilyDashboard from "./pages/Competition"
import EditTags from "./pages/Tag_Setup_fromNewTask"
import CompSettings from "./pages/compsettings"
import NewCompetition from "./pages/compsetup"
import Feed from "./pages/feed"
import TagRebuttal from "./pages/tagrebuttal" 
import TagRebuttals from "./pages/tagrebuttals"
import TagSetup2 from "./pages/tagsetup2"
import TaskRebuttals from "./pages/taskrebuttals"

// export function TablerUsers(props) {
// 	return (<svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" {...props}><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2m1-17.87a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85"></path></svg>);
// } tere

function App() {
  const location = useLocation()

  const hideTaskbar = ["/newtask", "/compsettings", "/tagrebuttal", "/tagrebuttals", "/add_tags", "/tagsetup2"]
  const showTaskbar = !hideTaskbar.includes(location.pathname)

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/home" element={<HomeScreen />} />
        <Route path="/newtask" element={<NewTask />} />
        <Route path="/competition" element={<FamilyDashboard />} />

        <Route path="/compsettings" element={<CompSettings />} />
        <Route path="/compsetup" element={<NewCompetition />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/tagrebuttal" element={<TagRebuttal />} />
        <Route path="/tagrebuttals" element={<TagRebuttals />} />
        <Route path="/tagsetup2" element={<TagSetup2 />} />
        <Route path="/taskrebuttals" element={<TaskRebuttals />} />

        {/* Tags */}
        <Route path="/add_tags" element={<EditTags />} />



      </Routes>

      {showTaskbar && <Taskbar page={location.pathname} />}
    </div>
  );
}

export default App;
