// THIS SYSTEM IS NOT IDEAL, WILL BE WORKED ON

// Old system (single user "Did you see that?")
// import { createContext, useContext, useEffect, useState } from "react";

// const UserContext = createContext(null);

// export function UserProvider({ children }) {
//   const [user, setUser] = useState(null);

// //   useEffect(() => {
// //     fetch("/api/me", { credentials: "include" })
// //       .then(res => res.json())
// //       .then(setUser)
// //       .catch(console.error);
// //   }, []);

// useEffect(() => {
//   // Hardcode your username here until you build login
//   fetch("/api/users/recc072hYAujrV14K")
//     .then(res => res.json())
//     .then(setUser)
//     .catch(console.error);
// }, []);

//   return (
//     <UserContext.Provider value={{ user, setUser }}>
//       {children}
//     </UserContext.Provider>
//   );
// }

// // e.g. const { user } = useUser();
// export function useUser() {
//   return useContext(UserContext);
// }

// New system (user data from database)
import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);