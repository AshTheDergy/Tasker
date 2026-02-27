import { useState } from "react";
import { useNavigate } from "react-router-dom";
export default function FamilySettingsScreen() {
  const navigate = useNavigate()
  const [familyName, setFamilyName] = useState("Family");

  const [competitors, setCompetitors] = useState([
    { id: 1, name: "Did You See That" },
    { id: 2, name: "Bleh User 1000" },
    { id: 3, name: "Eater 4" },
    { id: 4, name: "Did You See That 2" },
    { id: 5, name: "Cat" },
  ]);

  function handleEditTags() {
    alert("Edit Tags clicked");
  }

  function handleAddCompetitor() {
    const name = prompt("Enter competitor name");
    if (!name) return;

    setCompetitors([
      ...competitors,
      { id: Date.now(), name },
    ]);
  }

  function handleCompetitorOptions(id) {
    alert(`Options for competitor ${id}`);
  }

  function handleCancel() {
    alert("Cancelled");
  }

  function handleSave() {
    console.log({
      familyName,
      competitors,
    });
    alert("Saved");
  }

  return (
    <div className="subpage">
      <h1>Competition Settings</h1>

      <div className="input-group">
        <input
          type="text"
          placeholder="Competition name"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
        />
      </div>

      <div className="input-group space-between">
        <span className="label-bold">Edit Tags</span>
        <button className="action-btn" onClick={() => navigate("/tagsetup2")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      <h1 className="lefttitle">Competitors</h1>

        <div className="card">
          {competitors.map((competitor) => (
            <div className="name" key={competitor.id}>
              <div className="flex16">
                <img className="pfp" alt="pfp"></img>
                <h1>{competitor.name}</h1>
              </div>
              <button 
                className="image-button"
                onClick={() => handleCompetitorOptions(competitor.id)}>
                  <img src="src/assets/icons/dots.svg"></img>
              </button>
            </div>
          ))}
        </div>

      <div className="centeritem">
        <button 
          className="action-btn-40"
          onClick={handleAddCompetitor}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>

      <div className="button-row">
        <button className="button-secondary" onClick={() => navigate(-1)}>Cancel</button> {/* nupp (./pages/competition) */}
        <button className="button-primary" onClick={() => navigate(-1)}>Save</button> {/* nupp (./pages/competition) */}
      </div>
    </div>
  );
}
