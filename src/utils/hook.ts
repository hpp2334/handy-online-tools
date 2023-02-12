import { useCallback, useState } from "react";

export function useForceUpdate() {
    const [token, setV] = useState(0)

    const forceUpdate = useCallback(() => {
        setV(v => v + 1);
    }, [])

    return [token, forceUpdate] as const;
}