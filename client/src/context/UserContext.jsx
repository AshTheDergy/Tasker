import { createContext, useContext, useState, useEffect } from "react";
const UserContext = createContext();
export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("tasker_user"));
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (user) localStorage.setItem("tasker_user", JSON.stringify(user));
    else localStorage.removeItem("tasker_user");
  }, [user]);

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}
export const useUser = () => useContext(UserContext);