// NOT IDEAL, WILL BE WORKED ON
// STILL USES THE OLD API SYSTEM

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../lib/api";

export default function JoinFamily() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid invite link");
      setLoading(false);
      return;
    }
    
    apiFetch(`/api/invite/${token}`)
      .then(setInvite)
      .catch(e => {
        setError(e.data?.error || "Invalid or expired invite");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!user?.id) {
      navigate("/login", { state: { next: `/join/${token}` } });
      return;
    }

    try {
      const result = await apiFetch(`/api/invite/${token}/accept`, {
        method: "POST",
      });
      
      if (setUser) {
        const fresh = await apiFetch(`/api/users/${user.id}`);
        setUser(fresh);
      }
      navigate("/competition", { state: { entering: true } });
      
    } catch (e) {
      if (e.status === 409 && e.data?.error?.includes("Already a member")) {
        navigate("/competition", { state: { entering: true } });
        return;
      }
      
      console.error("Invite accept error:", e);
      setError(e.data?.error || "Something went wrong");
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center">Loading…</div>;
  }

  if (error || !invite) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-red-500 font-semibold">{error || "Invite not found"}</p>
        <button onClick={() => navigate("/competition")} className="buttonM">
          Back to Competitions
        </button>
      </div>
    );
  }

  return (
    <div className="h-full bg-bg flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-2">Join {invite.family_name}?</h1>
        <p className="text-gray-500 mb-6">
          You'll be added as a member and can start competing right away.
        </p>
        
        {user ? (
          <button
            onClick={handleAcceptInvite}
            className="w-full py-3 bg-primary text-white rounded-2xl font-semibold active:scale-95 transition-transform"
          >
            Accept Invite
          </button>
        ) : (
          <button
            onClick={() => navigate("/login", { state: { next: `/join/${token}` } })}
            className="w-full py-3 bg-primary text-white rounded-2xl font-semibold"
          >
            Log In to Accept
          </button>
        )}
        
        <button
          onClick={() => navigate("/competition")}
          className="w-full py-3 mt-3 text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}