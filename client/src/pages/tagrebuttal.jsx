import React, { useState } from "react";

function TagRebuttal() {
  const [comment, setComment] = useState("");

  const handleCancel = () => {
    console.log("Cancelled");
  };

  const handleSend = () => {
    console.log("Sending rebuttal:", comment);
  };

  const handleViewProposed = () => {
    console.log("View proposed tag order");
  };

  const handleEditNewOrder = () => {
    console.log("Edit new tag order");
  };

  return (
    <div className="subpage">
      <h1>Tag Rebuttal</h1>

      <div className="name padx16">
        <div className="flex16">
          <img className="pfp" alt="pfp"></img>
          <h1>Did You See That</h1>
        </div>
      </div>

      <div className="flex8 padx16">
        <h1>Proposed Tag Order</h1>
        <button className="priority-pill high" onClick={handleViewProposed}>View</button> {/* nupp (./pages/viewtags) */}
      </div>

      <div className="input-group flex8">
        <h1>New Tag Order</h1>
        <button className="priority-pill high" onClick={handleEditNewOrder}>Edit</button> {/* nupp (./pages/tagsetup) */}
      </div>

      <div className="input-group">
        <textarea
          placeholder="Add Comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          cols={40}
        />
      </div>

      <p className="helper-text">Sending a rebuttal will revoke your verification</p>

      <div className="button-row">
        <button className="button-secondary" onClick={handleCancel}>Cancel</button> {/* nupp (./pages/tagrebuttals) */}
        <button className="button-primary" onClick={handleSend}>Send</button> {/* nupp (./pages/tagrebuttals) */}
      </div>
    </div>
  );
}

export default TagRebuttal;
