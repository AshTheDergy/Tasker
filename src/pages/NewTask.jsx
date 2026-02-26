import React, { useState } from "react";
import {useNavigate} from "react-router-dom"

export default function NewTaskScreen() {
  const navigate = useNavigate()
  const [taskName, setTaskName] = useState("");
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [tags, setTags] = useState([]);
  const [categoriesOpt, setCategoriesOpt] = useState([])
  const [categories, setCategories] = useState([]);
  const [collaborators, setCollaborators] = useState([]);

  const handleAddTag = () => {
    const tag = prompt("Enter tag:");
    if (tag) setTags([...tags, tag]);
  };

  const handleAddCategory = () => {
    const category = prompt("Enter category:");
    if (category) setCategories(category);
  };

  const handleAddCollaborator = () => {
    const collaborator = prompt("Enter collaborator:");
    if (collaborator) setCollaborators([...collaborators, collaborator]);
  };

  const handleSave = async () => {
    const combTime = date && time ? `${date}T${time}:00` : null;
    const data = {
      Name: taskName,
      Time: combTime,
      Description: "",
      // Location: location,
      // Priority: priority,
      // Tags: tags,
      // Categories: categories,
      // Collaborators: collaborators,
      Category: categories,
      Status: "Incomplete", // default
    };
    
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error("Failed to save task");
      console.log("Task saved successfully");
      handleCancel();
    } catch (err) {
      console.error("Error saving task:", err);
    }
  };


  const handleCancel = () => {
    setTaskName("");
    setTime("");
    setLocation("");
    setPriority("Medium");
    setTags([]);
    setCategories([]);
    setCollaborators([]);
    navigate(-1)
  };



  // useEffect(() => {
  // fetch("http:///api/categories")
  //   .then(res => res.json())
  //   .then(data => setCategoriesOpt(data))
  //   .catch(err => console.error(err));
  // }, []);

  //console.log()


  return (
    
    <div className="subpage">

      <h1>New Task</h1>

      <div className="input-group">
        <input
          type="text"
          placeholder="Task name"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
        />
      </div>

      {/* Select Time Input */}
      <div className="input-group">
        {/* Calendar Icon SVG */}
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <text x="12" y="17" fontSize="6" strokeWidth="1" textAnchor="middle" fill="currentColor">1</text>
        </svg>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        {/* <input
          type="datetime-local"
          value={time}
          onChange={(e) => {
            console.log("Selected datetime:", e.target.value);
            setTime(e.target.value);
          }}
        /> */}
      </div>

      {/* Select Location Input */}
      <div className="input-group">
        {/* Map Pin Icon SVG */}
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          type="text"
          placeholder="Select Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      {/* 2. Select Priority */}
      <div className="input-group priority-container">
        <span className="label-bold">Select Priority</span>
        <div className="priority-group">
          <button className="priority-pill low">Low</button>
          <button className="priority-pill medium">Medium</button>
          <button className="priority-pill high">High</button>
        </div>
      </div>

      {/* 3. Add Tags */}
      <div className="input-group flex-start">
        <span className="label-bold">Add Tags</span>
        <button className="action-btn" onClick={() => navigate("/add_tags")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
      <p className="helper-text">Adding a tag will enter you into a competition</p>

      {/* 4. Add Category */}
      <div className="input-group flex-start">
        <span className="label-bold">Add Category</span>
        <button className="action-btn" onClick={handleAddCategory}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

{/* 5. Add Collaborators */}
      <div className="input-group space-between">
        <span className="label-bold">Add Collaborators</span>
        <button className="action-btn" onClick={handleAddCollaborator}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

{/* Save/Cancel Buttons */}
      <div className="button-row">
        <button className="button-secondary" onClick={handleCancel}>Cancel</button>
        <button className="button-primary" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}