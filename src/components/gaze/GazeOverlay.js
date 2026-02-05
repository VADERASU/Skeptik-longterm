import React from 'react';
import { css } from '@emotion/css';

/**
 * Visual overlay showing gaze position and fixation point.
 * Useful for debugging and demonstration.
 */
export function GazeOverlay({
    gazePosition = { x: 0, y: 0 },
    fixationData = null,
    isConnected = false,
    showCursor = true,
    showFixation = true,
    showStatus = true
}) {
    if (!showStatus && !isConnected) {
        return null;
    }

    const x = gazePosition?.x || 0;
    const y = gazePosition?.y || 0;

    return (
        <>
            {/* Status indicator */}
            {showStatus && (
                <div className={statusStyle}>
                    <span className={isConnected ? connectedDot : disconnectedDot} />
                    Eye Tracker: {isConnected ? 'Connected' : 'Disconnected'}
                    {isConnected && (
                        <span className={coordsStyle}>
                            ({Math.round(x)}, {Math.round(y)})
                        </span>
                    )}
                </div>
            )}

            {/* Gaze cursor */}
            {isConnected && showCursor && x > 0 && y > 0 && (
                <div
                    className={gazeCursorStyle}
                    style={{
                        left: x,
                        top: y,
                    }}
                />
            )}

            {/* Fixation indicator */}
            {isConnected && showFixation && fixationData && fixationData.duration > 0.1 && (
                <div
                    className={fixationStyle}
                    style={{
                        left: fixationData.x || 0,
                        top: fixationData.y || 0,
                        transform: `translate(-50%, -50%) scale(${Math.min(fixationData.duration * 2, 3)})`,
                    }}
                />
            )}
        </>
    );
}

// Styles
const statusStyle = css`
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const connectedDot = css`
    width: 8px;
    height: 8px;
    background: #4caf50;
    border-radius: 50%;
`;

const disconnectedDot = css`
    width: 8px;
    height: 8px;
    background: #f44336;
    border-radius: 50%;
`;

const coordsStyle = css`
    margin-left: 8px;
    opacity: 0.7;
`;

const gazeCursorStyle = css`
    position: fixed;
    width: 20px;
    height: 20px;
    background: rgba(255, 0, 0, 0.4);
    border: 2px solid rgba(255, 0, 0, 0.8);
    border-radius: 50%;
    pointer-events: none;
    transform: translate(-50%, -50%);
    z-index: 9999;
    transition: left 0.05s, top 0.05s;
`;

const fixationStyle = css`
    position: fixed;
    width: 30px;
    height: 30px;
    background: rgba(0, 100, 255, 0.2);
    border: 2px solid rgba(0, 100, 255, 0.5);
    border-radius: 50%;
    pointer-events: none;
    z-index: 9998;
    transition: transform 0.1s;
`;

export default GazeOverlay;
