import React from 'react';

//kas see ei saaks olla lih newtask, aga täidetud infoga. nq ma ei arva see peab olema eraldi leht or am i stupid - Aron

const EditTask = () => {
  return (
    <div className="edit-task-container">
      {/* Header */}
      <header>
        <button className="back-button">←</button>
        <h1>Edit Task</h1>
        <button className="pin-icon">📌</button>
      </header>

      <form>
        {/* Task Title Input */}
        <div className="form-group">
          <input type="text" defaultValue="UPT" placeholder="Task Name" />
        </div>

        {/* Date Selection */}
        <div className="form-group">
          <label>📅 19 January 2026</label>
        </div>

        {/* Time Selection */}
        <div className="form-group">
          <label>🕒 Select Time</label>
        </div>

        {/* Priority Selection */}
        <div className="form-group inline-row">
          <label>Select Priority</label>
          <div className="priority-options">
            <button type="button">Low</button>
            <button type="button">Medium</button>
            <button type="button" className="active">High</button>
          </div>
        </div>

        {/* Tags Section */}
        <div className="form-group">
          <div className="inline-row">
            <label>Add Tags</label>
            <div className="tag-chip">
              Important Deadline <button className="remove-tag">×</button>
            </div>
            <button type="button" className="add-btn">+</button> {/* nupp (./pages/tagsetup) */}
          </div>
          <small className="hint-text">Adding a tag will enter you into a competition</small>
        </div>

        {/* Category Section */}
        <div className="form-group inline-row">
          <label>Add Category</label> 
          <div className="category-chip">
            Schoolwork <button className="remove-tag">×</button>
          </div>
          <button type="button" className="add-btn">+</button> {/* nupp (./pages/tagsetup) */}
        </div>

        {/* Collaborators Section */}
        <div className="form-group clickable-row">
          <label>Add Collaborators</label>
          <span className="arrow-icon">›</span>
        </div>

        {/* Action Buttons */}
        <footer className="form-actions">
          <button type="button" className="btn-cancel">Cancel</button> {/* nupp (./pages/homescreen) */}
          <button type="submit" className="btn-complete">Complete</button> {/* nupp (./pages/verify) */}
          <button type="submit" className="btn-save">Save</button> {/* nupp (./pages/homescreen) */}
        </footer>
      </form>
    </div>
  );
};

export default EditTask;