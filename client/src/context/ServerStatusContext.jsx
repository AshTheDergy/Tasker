// NOT IDEAL, WILL BE WORKED ON

import { createContext, useContext, useEffect, useRef } from "react";
import { useOnlineStatus }       from "../hooks/useOnlineStatus";
import { useServerStatus }       from "../hooks/useServerStatus";
import { setConnectionStatus, setApiFailureCallback } from "../lib/api";

const ServerStatusContext = createContext({ isOnline: true, isServerUp: true });

export function ServerStatusProvider({ children }) {
  const isOnline                      = useOnlineStatus();
  const { isServerUp, startChecking } = useServerStatus(isOnline);
  const wasDownRef                    = useRef(false);

  useEffect(() => {
    setApiFailureCallback(startChecking);
    return () => setApiFailureCallback(null);
  }, [startChecking]);

  useEffect(() => {
    setConnectionStatus(isOnline, isServerUp);

    if (!isServerUp) {
      wasDownRef.current = true;
    }

    if (isServerUp && wasDownRef.current) {
      wasDownRef.current = false;
      window.location.reload();
    }
  }, [isOnline, isServerUp]);

  return (
    <ServerStatusContext.Provider value={{ isOnline, isServerUp }}>
      {children}
    </ServerStatusContext.Provider>
  );
}

export function useServerStatusContext() {
  return useContext(ServerStatusContext);
}