'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect if the component has mounted on the client.
 * This is useful for avoiding hydration mismatches with Zustand persist.
 */
export function useHasMounted(): boolean {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    return hasMounted;
}
