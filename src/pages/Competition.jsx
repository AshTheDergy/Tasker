import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FamilyDashboard = () => {
  const navigate = useNavigate()
  const [familyMembers, setFamilyMembers] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompetitionData = async () => {
      try {
        const response = await fetch("/api/competitive_users")

        if (!response.ok) throw new Error("Failed to fetch data");

        const membersData = await response.json();

        setFamilyMembers(membersData);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitionData();
  }, []);

  return (
    <div className="subpage">

      <main>
        {/* Title and Actions */}
        <section className="space-between">
          <h2>Family</h2>
          <div className="flex8">
            <button className="action-btn-40" onClick={() => navigate("/compsetup")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>

            <button className="action-btn-40" onClick={() => navigate("/compsettings")}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0"/></g></svg>
            </button>
          </div>
        </section>

        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>Error: {error}</p>}

        {/* Leaderboard Card */}
        <section className="leaderboard">

          {familyMembers.filter((e) => e.Assigned_Comp.includes("recXb6F9S2VhjYIDU")).map((member, index) => (
            <div key={member.id} className="leaderboard-item">
              <span>{index + 1}. </span>
              <img className="avatar" src={member.avatar.url}/>
              <span className="name">{member.username}</span>
              <span className="points">{member.points}</span>
            </div>
          ))}
        </section>

        {/* Updates Section */}
        <section>
          <div className="space-between">
            <h1 className="lefttitle">Latest Updates</h1>
            <button className="priority-pill high" onClick={() => navigate("/feed")}>Open feed</button> {/* nupp (./pages/feed) */}
          </div>
          
          <div className="updates-list">
            {recentUpdates.map((update) => (
              <div key={update.id} className="update-item">
                <span className="avatar">👤</span>
                <div className="update-info">
                <p className="user-name">{update.user}</p>
                </div>
                <div className="update-action">
                  <p>{update.action}</p>
                  {update.subtext && <small>{update.subtext}</small>}
                </div>
              </div>
            ))}
          </div>
          <div className="pagination-dots">...</div>
        </section>
      </main>

      
    </div>
  );
};

export default FamilyDashboard;