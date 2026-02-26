import { useState } from "react";

export default function TagRebuttalsScreen() {
  const [entries] = useState([
    {
      id: 1,
      user: "Meowl",
      time: "2 Hours Ago",
      type: "Changed Tags",
      message: "i think theyre even more important. added 1 more spacers",
    },
    {
      id: 2,
      user: "Did You See That 2",
      time: "1 Week Ago",
      type: "Tags Unchanged",
      message: "no bro",
    },
  ]);

  function handleViewProposedTags() {
    alert("View Proposed Tags");
  }

  function handleViewChangedTags(entryId) {
    alert(`View tags for entry ${entryId}`);
  }

  function handleBack() {
    alert("Back pressed");
  }

  function handleRebut() {
    alert("Rebut action");
  }

  return (
    <div className="subpage">
      <h1>Tag Rebuttals</h1>

      {/* Main User */}
      <div className="name padx16">
        <div className="flex16">
          <img className="pfp" alt="pfp"></img>
          <h1>Did You See That</h1>
        </div>
      </div>

      <div className="flex8 padx16">
        <h1>Proposed Tag Order</h1>
        <button className="priority-pill high" onClick={handleViewProposedTags}>View</button> {/* nupp (./pages/viewtags) */}
      </div>

      {/* Entries */}
      <div className="col16">
        {entries.map((entry) => (
          <div className="card alignleft" key={entry.id}>
            <div className="name">
              <div className="flex16">
                <img className="pfp" alt="pfp" />
                <h1>{entry.user}</h1>
              </div>
              <span className="small-text">{entry.time}</span>
            </div>

            <div className="flex8">
              <h1>{entry.type}</h1>
              <button className="priority-pill high" onClick={() => handleViewChangedTags(entry.id)}>
                View {/* nupp (./pages/tagsetup) */}
              </button>
            </div>

            <p>{entry.message}</p>
          </div>
        ))}

      </div>

      {/* Bottom Actions */}
      <div className="button-row">
        <button className="button-secondary" onClick={handleBack}>Back</button> {/* nupp (./pages/feed) */}
        <button className="button-primary" onClick={handleRebut}>Rebut</button> {/* nupp (./pages/tagrebutal) */}
      </div>
    </div>
  );
}
