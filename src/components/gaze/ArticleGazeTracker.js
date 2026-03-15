import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useGazeTracking } from '../../hooks/useGazeTracking';
import { GazeOverlay } from './GazeOverlay';

/**
 * ArticleGazeTracker - Integrates eye tracking with article content.
 * Tracks which sentences, paragraphs, and elements the user is looking at.
 */
export function ArticleGazeTracker({
    enabled = true,
    showOverlay = true,
    onSentenceGaze,
    onParagraphGaze,
    onFallacyGaze,
    onGazeMetrics,
    children
}) {
    const [gazeMetrics, setGazeMetrics] = useState({
        totalReadTime: 0,
        sentenceDwellTimes: {},
        paragraphDwellTimes: {},
        fallacyDwellTimes: {},
        chartDwellTimes: {},
        tagDwellTimes: {},
        gazeSequence: [],
        currentFocus: null
    });

    const metricsRef = useRef(gazeMetrics);
    const lastElementRef = useRef(null);
    const lastFallacyRef = useRef(null);
    const lastElementTypeRef = useRef(null);
    const enterTimeRef = useRef(null);

    // Update ref when metrics change
    useEffect(() => {
        metricsRef.current = gazeMetrics;
    }, [gazeMetrics]);

    // Handle when gaze lands on an element
    const handleElementGaze = useCallback((elementInfo, screenPos, rawData) => {
        if (!elementInfo) return;
        const { element } = elementInfo;
        if (!element || typeof element.closest !== 'function') return;

        // Find the sentence, paragraph, fallacy, chart, or tag element
        let sentenceEl = null;
        let paragraphEl = null;
        let fallacyEl = null;
        let chartEl = null;
        let tagEl = null;

        try {
            sentenceEl = element.closest('[id*="news-sentence"]');
            paragraphEl = element.closest('[id*="news-content"]');
            fallacyEl = element.closest('[data-fallacy]');
            chartEl = element.closest('[id*="fallacy-image"]') || element.closest('canvas');
            tagEl = element.closest('[id*="fnode_"]') || element.closest('.underline_minimap');
        } catch (e) {
            return; // Element doesn't support closest
        }

        const currentId = sentenceEl?.id || chartEl?.id || tagEl?.id || paragraphEl?.id || element.id;
        const currentFallacy = fallacyEl?.dataset?.fallacy || null;
        const elementType = chartEl ? 'chart' : (tagEl ? 'tag' : (sentenceEl ? 'sentence' : 'other'));
        const now = Date.now();

        // Track transitions between elements
        if (lastElementRef.current !== currentId) {
            // Calculate dwell time on previous element
            if (lastElementRef.current && enterTimeRef.current) {
                const dwellTime = now - enterTimeRef.current;
                updateDwellTime(lastElementRef.current, dwellTime, lastFallacyRef.current, lastElementTypeRef.current);
            }

            // Start tracking new element
            lastElementRef.current = currentId;
            lastFallacyRef.current = currentFallacy;
            lastElementTypeRef.current = elementType;
            enterTimeRef.current = now;

            // Add to gaze sequence (keep last 10000 points for user studies)
            setGazeMetrics(prev => ({
                ...prev,
                gazeSequence: [...prev.gazeSequence, {
                    elementId: currentId,
                    elementType: elementType,
                    fallacyType: currentFallacy,
                    timestamp: now,
                    position: screenPos,
                    scrollY: window.scrollY,
                    scrollX: window.scrollX
                }].slice(-10000),
                currentFocus: currentId
            }));
        }

        // Fire callbacks
        if (sentenceEl && onSentenceGaze) {
            const [sentenceIndex, , , paragraphIndex] = sentenceEl.id.split('-');
            onSentenceGaze({
                sentenceIndex: parseInt(sentenceIndex),
                paragraphIndex: parseInt(paragraphIndex),
                element: sentenceEl,
                position: screenPos,
                rawData
            });
        }

        if (paragraphEl && onParagraphGaze) {
            const paragraphIndex = paragraphEl.id.split('-')[2];
            onParagraphGaze({
                paragraphIndex: parseInt(paragraphIndex),
                element: paragraphEl,
                position: screenPos,
                rawData
            });
        }

        if (fallacyEl && onFallacyGaze) {
            onFallacyGaze({
                fallacyType: fallacyEl.dataset.fallacy,
                element: fallacyEl,
                position: screenPos,
                rawData
            });
        }
    }, [onSentenceGaze, onParagraphGaze, onFallacyGaze]);

    // Update dwell time for an element
    const updateDwellTime = useCallback((elementId, dwellTime, fallacyType, elementType) => {
        if (dwellTime < 50) return; // Ignore very short glances

        setGazeMetrics(prev => {
            const newMetrics = { ...prev };
            newMetrics.totalReadTime += dwellTime;

            if (elementId.includes('news-sentence')) {
                newMetrics.sentenceDwellTimes[elementId] =
                    (newMetrics.sentenceDwellTimes[elementId] || 0) + dwellTime;
            } else if (elementId.includes('news-content')) {
                newMetrics.paragraphDwellTimes[elementId] =
                    (newMetrics.paragraphDwellTimes[elementId] || 0) + dwellTime;
            }

            // Track chart dwell times
            if (elementType === 'chart' || elementId.includes('fallacy-image')) {
                newMetrics.chartDwellTimes[elementId] =
                    (newMetrics.chartDwellTimes[elementId] || 0) + dwellTime;
            }

            // Track tag dwell times
            if (elementType === 'tag' || elementId.includes('fnode_')) {
                newMetrics.tagDwellTimes[elementId] =
                    (newMetrics.tagDwellTimes[elementId] || 0) + dwellTime;
            }

            // Track fallacy dwell times
            if (fallacyType) {
                newMetrics.fallacyDwellTimes[fallacyType] =
                    (newMetrics.fallacyDwellTimes[fallacyType] || 0) + dwellTime;
            }

            return newMetrics;
        });
    }, []);

    // Use the gaze tracking hook
    const {
        isConnected,
        gazePosition,
        fixationData,
    } = useGazeTracking({
        enabled,
        onElementGaze: handleElementGaze,
    });

    // Report metrics periodically
    useEffect(() => {
        if (!onGazeMetrics) return;

        const interval = setInterval(() => {
            onGazeMetrics(metricsRef.current);
        }, 1000);

        return () => clearInterval(interval);
    }, [onGazeMetrics]);

    return (
        <>
            {showOverlay && (
                <GazeOverlay
                    gazePosition={gazePosition}
                    fixationData={fixationData}
                    isConnected={isConnected}
                />
            )}
            {children}
        </>
    );
}

/**
 * Get reading metrics summary
 */
export function getReadingMetrics(gazeMetrics) {
    const { sentenceDwellTimes, paragraphDwellTimes, totalReadTime, gazeSequence } = gazeMetrics;

    // Most read sentences
    const topSentences = Object.entries(sentenceDwellTimes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    // Most read paragraphs
    const topParagraphs = Object.entries(paragraphDwellTimes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    // Reading pattern (linear vs jumping)
    let linearTransitions = 0;
    let jumpTransitions = 0;

    for (let i = 1; i < gazeSequence.length; i++) {
        const prev = gazeSequence[i - 1].elementId;
        const curr = gazeSequence[i].elementId;

        if (prev && curr && prev.includes('sentence') && curr.includes('sentence')) {
            const prevNum = parseInt(prev.split('-')[0]);
            const currNum = parseInt(curr.split('-')[0]);

            if (Math.abs(currNum - prevNum) <= 1) {
                linearTransitions++;
            } else {
                jumpTransitions++;
            }
        }
    }

    const linearityScore = linearTransitions / (linearTransitions + jumpTransitions + 1);

    return {
        totalReadTimeSeconds: totalReadTime / 1000,
        topSentences,
        topParagraphs,
        linearityScore,
        gazePointCount: gazeSequence.length
    };
}

export default ArticleGazeTracker;
