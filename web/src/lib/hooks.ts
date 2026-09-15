import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Plan } from './types';

/** Pricing catalogue + feature flags, fetched once per page load. */
let plansCache: Plan[] | null = null;
let simulationCache = false;

export function usePlans(): { plans: Plan[]; simulation: boolean } {
  const [plans, setPlans] = useState<Plan[]>(plansCache ?? []);
  const [simulation, setSimulation] = useState(simulationCache);

  useEffect(() => {
    if (plansCache) return undefined;
    let alive = true;
    api
      .meta()
      .then((meta) => {
        if (!alive) return;
        plansCache = meta.plans;
        simulationCache = meta.simulation;
        setPlans(meta.plans);
        setSimulation(meta.simulation);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return { plans, simulation };
}

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Re-runs `callback` every `intervalMs` while `enabled` is true. */
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = window.setInterval(() => saved.current(), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, enabled]);
}

/** Ticking clock used by countdowns (updates once a second). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
