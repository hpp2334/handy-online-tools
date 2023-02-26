import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export function useForceUpdate() {
  const [token, setV] = useState(0);

  const forceUpdate = useCallback(() => {
    setV((v) => v + 1);
  }, []);

  return [token, forceUpdate] as const;
}

export function useIsMount() {
  const isMountRef = useRef(true);
  isMountRef.current = true;

  const isMount = useCallback(() => isMountRef.current, []);

  useLayoutEffect(() => {
    isMountRef.current = true;
    return () => {
      isMountRef.current = false;
    };
  }, []);

  return isMount;
}

export function useAsyncMemo<T>(
  fn: () => Promise<T>,
  deps: Array<any>
): T | null {
  const [data, setData] = useState<T | null>(null);
  const fnRef = useRef<typeof fn>(fn);
  fnRef.current = fn;

  const isMount = useIsMount();

  useEffect(() => {
    fnRef.current().then((v) => {
      const mounted = isMount();
      if (mounted) {
        setData(v);
      }
    });
  }, deps);

  return isMount() ? data : null;
}
