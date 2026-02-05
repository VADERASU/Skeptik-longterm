import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for Gazepoint eye tracking integration.
 * Connects to the Python WebSocket bridge and provides gaze data.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.wsUrl - WebSocket server URL (default: ws://localhost:8765)
 * @param {boolean} options.enabled - Whether tracking is enabled
 * @param {Function} options.onGazeData - Callback for raw gaze data
 * @param {Function} options.onElementGaze - Callback when gaze is on a tracked element
 */
export function useGazeTracking(options = {}) {
    const {
        wsUrl = 'ws://localhost:8765',
        enabled = true,
        onGazeData = null,
        onElementGaze = null,
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [gazePosition, setGazePosition] = useState({ x: 0, y: 0 });
    const [fixationData, setFixationData] = useState(null);
    const [currentElement, setCurrentElement] = useState(null);
    const [gazeHistory, setGazeHistory] = useState([]);

    const wsRef = useRef(null);
    const trackedElementsRef = useRef(new Map());
    const reconnectTimeoutRef = useRef(null);

    // Convert normalized gaze coordinates (0-1) to screen pixels
    const normalizedToScreen = useCallback((normalizedX, normalizedY) => {
        return {
            x: normalizedX * window.innerWidth,
            y: normalizedY * window.innerHeight
        };
    }, []);

    // Find which DOM element is under the gaze point
    const findElementAtGaze = useCallback((screenX, screenY) => {
        // Check tracked elements first
        for (const [id, element] of trackedElementsRef.current) {
            const rect = element.getBoundingClientRect();
            if (
                screenX >= rect.left &&
                screenX <= rect.right &&
                screenY >= rect.top &&
                screenY <= rect.bottom
            ) {
                return { id, element, rect };
            }
        }

        // Fall back to elementFromPoint
        const element = document.elementFromPoint(screenX, screenY);
        return element ? { id: element.id, element, rect: element.getBoundingClientRect() } : null;
    }, []);

    // Register an element for gaze tracking
    const trackElement = useCallback((id, element) => {
        if (element) {
            trackedElementsRef.current.set(id, element);
        }
    }, []);

    // Unregister an element
    const untrackElement = useCallback((id) => {
        trackedElementsRef.current.delete(id);
    }, []);

    // Handle incoming gaze data
    const handleGazeData = useCallback((data) => {
        if (!data.valid && data.valid !== undefined) return;

        const screenPos = normalizedToScreen(data.x, data.y);
        setGazePosition(screenPos);

        // Update fixation data if available
        if (data.fix_valid) {
            setFixationData({
                x: data.fix_x * window.innerWidth,
                y: data.fix_y * window.innerHeight,
                duration: data.fix_duration
            });
        }

        // Find element under gaze
        const elementInfo = findElementAtGaze(screenPos.x, screenPos.y);
        if (elementInfo) {
            setCurrentElement(elementInfo);
            if (onElementGaze) {
                onElementGaze(elementInfo, screenPos, data);
            }
        }

        // Track gaze history (last 100 points)
        setGazeHistory(prev => {
            const newHistory = [...prev, { ...screenPos, time: data.time || Date.now() }];
            return newHistory.slice(-100);
        });

        if (onGazeData) {
            onGazeData(data, screenPos);
        }
    }, [normalizedToScreen, findElementAtGaze, onGazeData, onElementGaze]);

    // WebSocket connection management
    useEffect(() => {
        if (!enabled) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        let isMounted = true;

        const connect = () => {
            if (!isMounted) return;

            try {
                const ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    if (isMounted) {
                        console.log('Connected to Gazepoint bridge server');
                        setIsConnected(true);
                    }
                };

                ws.onmessage = (event) => {
                    if (!isMounted) return;
                    try {
                        const data = JSON.parse(event.data);
                        handleGazeData(data);
                    } catch (e) {
                        // Silently ignore parse errors
                    }
                };

                ws.onclose = () => {
                    if (isMounted) {
                        setIsConnected(false);
                        // Attempt reconnect after 5 seconds
                        reconnectTimeoutRef.current = setTimeout(connect, 5000);
                    }
                };

                ws.onerror = () => {
                    // Silently handle - will trigger onclose
                };

                wsRef.current = ws;
            } catch (e) {
                // Failed to connect, retry later
                if (isMounted) {
                    reconnectTimeoutRef.current = setTimeout(connect, 5000);
                }
            }
        };

        // Delay initial connection attempt
        reconnectTimeoutRef.current = setTimeout(connect, 1000);

        return () => {
            isMounted = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [wsUrl, enabled, handleGazeData]);

    return {
        isConnected,
        gazePosition,
        fixationData,
        currentElement,
        gazeHistory,
        trackElement,
        untrackElement,
    };
}

/**
 * Calculate dwell time statistics for elements
 */
export function useDwellTime(gazeHistory, trackedElements) {
    const [dwellTimes, setDwellTimes] = useState({});

    useEffect(() => {
        const times = {};

        for (const [id, element] of Object.entries(trackedElements)) {
            if (!element) continue;
            const rect = element.getBoundingClientRect();

            let totalDwell = 0;
            let lastInElement = false;
            let enterTime = null;

            gazeHistory.forEach((point) => {
                const inElement = (
                    point.x >= rect.left &&
                    point.x <= rect.right &&
                    point.y >= rect.top &&
                    point.y <= rect.bottom
                );

                if (inElement && !lastInElement) {
                    enterTime = point.time;
                } else if (!inElement && lastInElement && enterTime) {
                    totalDwell += point.time - enterTime;
                }
                lastInElement = inElement;
            });

            times[id] = totalDwell;
        }

        setDwellTimes(times);
    }, [gazeHistory, trackedElements]);

    return dwellTimes;
}

export default useGazeTracking;
