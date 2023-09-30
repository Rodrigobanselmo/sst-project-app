import { useState, useEffect, useCallback } from 'react';

export function useThrottle<T extends (...args: any[]) => void>(func: T, delay: number) {
    const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | undefined>();
    const [calledOnce, setCalledOnce] = useState(false);

    const throttledFunc = useCallback(
        function (this: ThisParameterType<T>, ...args: Parameters<T>) {
            if (!calledOnce) {
                func.apply(this, args);
                setCalledOnce(true);
            }

            if (!timeoutId) {
                setTimeoutId(
                    setTimeout(() => {
                        setCalledOnce(false);
                        setTimeoutId(undefined);
                    }, delay),
                );
            }
        },
        [calledOnce, delay, func, timeoutId],
    );

    return throttledFunc;
}
