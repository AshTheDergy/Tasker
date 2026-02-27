import React, { useState } from 'react';

const TaskRebuttal = () => {
  const [comment, setComment] = useState('');
  const [proposedTags, setProposedTags] = useState([]);

  const handleSend = () => {
    console.log("Sending rebuttal:", { comment, proposedTags });
    // Logic for revoking verification and submitting would go here
  };

  return (
    <div className="rebuttal-container">
      <h1>Task Rebuttal</h1>

      {/* Task Summary Section */}
      <section className="task-summary">
        <div className="user-info">
          <img src="avatar-url.png" alt="Eater 4" />
          <span>Eater 4</span>
        </div>
        
        <div className="task-details">
          <p>
            <strong>Tags:</strong> 
            <span className="tag">Important Deadline</span>
            <button>View</button>
          </p>
          <p><strong>Completed:</strong> clean room</p>
        </div>

        <div className="task-image">
          <img src="task-proof.png" alt="Proof of completed task" />
        </div>
      </section>

      <hr />

      {/* Input Section */}
      <section className="interaction-area">
        <div className="proposed-tags">
          <label>Proposed Tags</label>
          <button onClick={() => console.log('Add tag logic')}>+</button>
        </div>

        <textarea
          placeholder="Add Comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <p className="disclaimer">
          Sending a rebuttal will revoke your verification
        </p>
      </section>

      {/* Action Buttons */}
      <footer className="actions">
        <button className="btn-cancel">Cancel</button>
        <button className="btn-send" onClick={handleSend}>
          Send
        </button>
      </footer>
    </div>
  );
};

export default TaskRebuttal;