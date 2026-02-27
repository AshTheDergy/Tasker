import { useLocation, useNavigate } from "react-router-dom"

export default function Taskbar () {
    const location = useLocation()
    const navigate = useNavigate()

    return (
        <div className="taskbar">
            <button className={`nav-item ${location.pathname === "/home" ? "active" : ""}`} onClick={() => navigate("/home")}><img src="src/assets/icons/home.svg" width="24" height="24"/></button>
            <button className={`nav-item ${location.pathname === "/newtask" ? "active" : ""}`} onClick={() => navigate("/newtask")}><img src="src/assets/icons/circleplus.svg" width="24" height="24"/></button>
            <button className={`nav-item ${location.pathname === "/competition" ? "active" : ""}`} onClick={() => navigate("/competition")}><img src="src/assets/icons/users.svg" width="24" height="24"/></button>
        </div>
    )
}