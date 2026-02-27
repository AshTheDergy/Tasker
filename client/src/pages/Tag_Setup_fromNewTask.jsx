import React, { useState } from "react";

function EditTags() {
  const [tags, setTags] = useState([
    { id: 1, name: "Important Deadline", points: 12 },
    { id: 2, name: "Spacer", points: null },
    { id: 3, name: "Spacer", points: null },
    { id: 4, name: "Homework", points: 9 },
    { id: 5, name: "Chores", points: 8 },
    { id: 6, name: "Misc", points: 7 },
  ]);

  const [newTagName, setNewTagName] = useState("");
  const [newTagPoints, setNewTagPoints] = useState(0);

  const removeTag = (id) => {
    setTags(tags.filter((tag) => tag.id !== id));
  };

  const addTag = () => {
    if (!newTagName.trim()) return;

    const newTag = {
      id: Date.now(),
      name: newTagName,
      points: newTagPoints || 0,
    };

    setTags([...tags, newTag]);
    setNewTagName("");
    setNewTagPoints(0);
  };

  const handleCancel = () => {
    console.log("Cancel editing");
  };

  const handleSave = () => {
    console.log("Saved tags:", tags);
  };

  return (

    <div className="subpage">
      <h1>Edit Tags</h1>
      <p className="helper-text">Swipe to remove</p>

      {/* Tag List */}
      <div>
        {tags.map((tag) => (
          <div className="space-between" key={tag.id}>
            <span className="tag highest">{tag.name}</span> {/* spacer peaks olema "button-secondary" class'iga ja iga tase nõrgema värviga */}

            {tag.points !== null && (
              <span> {tag.points} pts </span>
            )}

            <button onClick={() => removeTag(tag.id)}>Remove</button>
          </div>
        ))}
      </div>

      {/* Add Tag */}
      <div>
        <input
          type="text"
          placeholder="Tag name"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
        />

        <input
          type="number"
          value={newTagPoints}
          onChange={(e) => setNewTagPoints(Number(e.target.value))}
        />

        <button onClick={addTag}>Add Spacer</button>
      </div>

      <div className="input-group priority-container addsticky">
        <input
          type="text"
          placeholder="Tag name"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
        />

        <div className="priority-group">
          <button className="priority-pill low">Add Spacer</button>
          <button onClick={addTag} className="action-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="button-row">
        <button className="button-secondary" onClick={handleCancel}>Cancel</button> {/* nupp (./pages/competition) */}
        <button className="button-primary" onClick={handleSave}>Save</button> {/* nupp (./pages/competition) */}
      </div>
    </div>
  );
}

export default EditTags;
