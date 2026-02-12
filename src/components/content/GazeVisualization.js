import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/css';

export const GazeVisualization = ({ gazePoint, isTracking }) => {
  const cursorRef = useRef(null);

  useEffect(() => {
    if (!gazePoint.x || !gazePoint.y || !isTracking) {
      return;
    }

    if (cursorRef.current) {
      cursorRef.current.style.left = `${gazePoint.x}px`;
      cursorRef.current.style.top = `${gazePoint.y}px`;
      cursorRef.current.style.opacity = '1';
    }
  }, [gazePoint, isTracking]);

  const gazeCursorStyle = css`
    position: fixed;
    width: 30px;
    height: 30px;
    border: 3px solid #ff4d4f;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.1s ease-out;
    box-shadow: 0 0 10px rgba(255, 77, 79, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;

    &::after {
      content: '';
      width: 6px;
      height: 6px;
      background-color: #ff4d4f;
      border-radius: 50%;
    }
  `;

  if (!isTracking) {
    return null;
  }

  return <div ref={cursorRef} className={gazeCursorStyle} />;
};
