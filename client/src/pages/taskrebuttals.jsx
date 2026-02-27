import React from 'react';

// Reusable card for each rebuttal entry
const RebuttalCard = ({ user, timeAgo, status, tags, comment }) => (
  <div className="card">
    <header>
      <img src={user.avatar} alt={user.name} />
      <strong>{user.name}</strong>
      <span>{timeAgo}</span>
    </header>
    
    <div>
      <strong>{status}</strong>
      {tags && tags.map(tag => (
        <span key={tag} className="tag">{tag}</span>
      ))}
    </div>

    <p>{comment}</p>
  </div>
);

const TaskRebuttals = () => {
  const taskData = {
    user: "Eater 4",
    tags: ["Important Deadline"],
    task: "clean room"
  };

  return (
    <div className="subpage">
      <h2>Task Rebuttals</h2>

      {/* Main Task Summary Section */}
      <section className="task-summary">
        <div className="task-info">
          <img src="avatar1.png" alt="Eater 4" />
          <h3>{taskData.user}</h3>
          <p>Tags: {taskData.tags.join(', ')} <button>View</button></p>
          <p>Completed: {taskData.task}</p>
        </div>
        <img src="task-image.png" alt="Task Proof" className="task-preview" />
      </section>

      {/* Rebuttal Cards */}
      <RebuttalCard 
        user={{ name: "Meowl", avatar: "cat.png" }}
        timeAgo="6 days ago"
        status="Changed Tags"
        tags={["Chores"]}
        comment="unc put everything but chores 🙏🙏"
      />

      <RebuttalCard 
        user={{ name: "Did You See That", avatar: "dog.png" }}
        timeAgo="7 days ago"
        status="Tags Unchanged"
        comment="are you blind"
      />

      {/* Navigation Footer */}
      <footer>
        <button type="button">Back</button>
        <button type="button">Rebut</button>
      </footer>
    </div>
  );
};

export default TaskRebuttals;