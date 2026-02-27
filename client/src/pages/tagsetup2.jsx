import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const EditTags = () => {
  const navigate = useNavigate()
  const [comment, setComment] = useState('');

  const handleSend = () => {
    console.log("Sending comment:", comment);
    // Logic for sending the tag order and comment would go here
  };

  const handleCancel = () => {
    console.log("Action cancelled");
    setComment('');
  };

    const handleEditNewOrder = () => {
    console.log("Edit new tag order");
  };

  return (
    <div className="subpage">
      <h2>Edit Tags</h2>

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

      <div className="button-row">
        <button className="button-secondary" onClick={() => navigate(-1)}>Cancel</button> {/* nupp (./pages/tagrebuttals) */}
        <button className="button-primary" onClick={() => navigate(-1)}>Send</button> {/* nupp (./pages/tagrebuttals) */}
      </div>
    </div>
  );
};

export default EditTags;