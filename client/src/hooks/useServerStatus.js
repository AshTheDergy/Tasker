// NOT IDEAL, WILL BE WORKED ON

import { useState, useEffect, useRef, useCallback } from "react";

const RECOVERY_INTERVAL = 60_000;
const PING_TIMEOUT      = 10_000;

export function useServerStatus(isOnline) {
  const [isServerUp, setIsServerUp]   = useState(true);
  const intervalRef                   = useRef(null);
  const isOnlineRef                   = useRef(isOnline);

  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  useEffect(() => {
      const checkInitial = async () => {
        if (!isOnlineRef.current) return;
        try {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), PING_TIMEOUT);
          const res = await fetch("/health", { method: "GET", signal: controller.signal, cache: "no-store" });
          clearTimeout(tid);
          if (!res.ok) startChecking();
        } catch {
          startChecking();
        }
      };
      checkInitial();
    }, []);

  const stopChecking = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const ping = useCallback(async () => {
    if (!isOnlineRef.current) return;
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), PING_TIMEOUT);
      const res = await fetch("/health", { method: "GET", signal: controller.signal, cache: "no-store" });
      clearTimeout(tid);
      if (res.ok) {
        setIsServerUp(true);
        stopChecking();
      }
    } catch {

    }
  }, [stopChecking]);

  const startChecking = useCallback(() => {
    if (intervalRef.current) return;
    setIsServerUp(false);
    ping();
    intervalRef.current = setInterval(ping, RECOVERY_INTERVAL);
  }, [ping]);


  useEffect(() => {
    if (!isOnline) startChecking();
  }, [isOnline, startChecking]);

  useEffect(() => () => stopChecking(), [stopChecking]);

  return { isServerUp, startChecking };
}

