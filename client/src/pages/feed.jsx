import React, { useState, useEffect } from 'react';

const ScrollableFeedMinimal = () => {
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const response = await fetch("/api/feed");
        if (!response.ok) throw new Error("Failed to fetch feed");
        const data = await response.json();
        setFeedItems(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

  return (
    <div className="subpage">

        <h2>Feed Content</h2>
        
        {loading && <p>Loading feed...</p>}
        {/* {error && <p style={{ color: "red" }}>Error: {error}</p>} */}
        {error && <p>There is currently no feed!</p>}

        {feedItems.length > 0 ? (
          feedItems.map((item, index) => (
            <section key={index}>
              <h3>{item.author || "User"}</h3>
              <p>{item.timestamp || "Just now"}</p>
              {item.tags && <div>{item.tags}</div>}
              <p>{item.content || item.description}</p>
              {item.votes && <div>Votes: {item.votes}</div>}
              <hr />
            </section>
          ))
        ) : (
          !loading && (
            <section>
              <img src="src/assets/icons/checkt.svg"></img>
              <h2>You're all caught up!</h2>
              <p>Everything forward is already verified by you</p>
            </section>
          )
        )}

        {/* Post 3 */}
          <div className="post">
            <div className="name">

              <div className="flex16">

                <img className="pfp" alt="pfp"></img>
                <h1>tempuser</h1>

              </div>
              <button 
                className="image-button">
                  <img src="src/assets/icons/dots.svg"></img>
              </button>

            </div>

            <span className="small-text alignleft" style={{ paddingBottom: '16px' }}>67 days ago</span>

            <div>
              <div style={{ height: '393px', background: '#bbbbbb' , margin: '0 -16px'}}>[Large Image Placeholder]</div>
              <p className="alignleft">Task Completed: roast chestnuts</p>
            </div>
          </div>
    </div>
    );
};

export default ScrollableFeedMinimal;