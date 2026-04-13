import { useUser } from "../context/UserContext";
import Login from "../pages/Login";
 
export default function AuthGate({ children }) {
  const { user } = useUser();
  if (!user) return <Login />;
  return children;
}
 