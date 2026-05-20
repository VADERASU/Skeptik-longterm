import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Modal, message, Input, Space, Typography, Divider } from "antd";
import { DownloadOutlined, UserOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

/**
 * StudyDataExporter - Comprehensive data collection and export for user studies
 *
 * Collects:
 * - All gaze data points (no truncation)
 * - Scroll events with timestamps
 * - Element interactions (clicks, hovers)
 * - Reading metrics (dwell times, reading patterns)
 * - Session metadata (participant ID, timestamps, article info)
 */
export function StudyDataExporter({
    gazeMetrics,
    articleInfo,
    fallacyChatList,
    enabled = true,
    onExportComplete
}) {
    const [participantId, setParticipantId] = useState("");
    const [sessionStartTime] = useState(Date.now());
    const [showExportModal, setShowExportModal] = useState(false);
    const [isRecording, setIsRecording] = useState(true);

    // Comprehensive data storage (no truncation)
    const allGazePointsRef = useRef([]);
    const scrollEventsRef = useRef([]);
    const clickEventsRef = useRef([]);
    const fallacyInteractionsRef = useRef([]);
    const viewportChangesRef = useRef([]);
    const explanationDepthRef = useRef({});  // Track max depth per fallacy
    const openFallaciesRef = useRef(new Set());  // Track currently open fallacies
    const annotationOpenTimesRef = useRef({});  // Track when each annotation was opened
    const annotationReadingTimeRef = useRef({});  // Track cumulative reading time per fallacy

    // Track scroll events
    useEffect(() => {
        if (!enabled || !isRecording) return;

        const handleScroll = () => {
            scrollEventsRef.current.push({
                timestamp: Date.now(),
                scrollX: window.scrollX,
                scrollY: window.scrollY,
                viewportHeight: window.innerHeight,
                viewportWidth: window.innerWidth,
                documentHeight: document.documentElement.scrollHeight
            });
        };

        const handleResize = () => {
            viewportChangesRef.current.push({
                timestamp: Date.now(),
                viewportHeight: window.innerHeight,
                viewportWidth: window.innerWidth
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize, { passive: true });

        // Record initial viewport
        viewportChangesRef.current.push({
            timestamp: Date.now(),
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
            type: 'initial'
        });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, [enabled, isRecording]);

    // Track click events on article elements
    useEffect(() => {
        if (!enabled || !isRecording) return;

        const handleClick = (e) => {
            const target = e.target;
            const sentenceEl = target.closest?.('[id*="news-sentence"]');
            const fallacyEl = target.closest?.('[data-fallacy]');
            const tagEl = target.closest?.('.underline_minimap') || target.closest?.('[id*="fnode_"]');
            const chartEl = target.closest?.('[id*="fallacy-image"]') || target.closest?.('canvas');

            if (sentenceEl || fallacyEl || tagEl || chartEl) {
                let elementType = 'sentence';
                if (chartEl) elementType = 'chart';
                else if (tagEl) elementType = 'fallacy-tag';
                else if (fallacyEl) elementType = 'fallacy-text';

                clickEventsRef.current.push({
                    timestamp: Date.now(),
                    elementId: chartEl?.id || tagEl?.id || sentenceEl?.id || fallacyEl?.id,
                    elementType: elementType,
                    fallacyType: fallacyEl?.dataset?.fallacy || tagEl?.textContent,
                    scrollY: window.scrollY,
                    clickX: e.clientX,
                    clickY: e.clientY
                });
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [enabled, isRecording]);

    // Accumulate gaze points from gazeMetrics (without truncation)
    useEffect(() => {
        if (!gazeMetrics?.gazeSequence || !isRecording) return;

        const latestPoints = gazeMetrics.gazeSequence;
        if (latestPoints.length > 0) {
            // Add new points that we haven't seen yet
            const existingTimestamps = new Set(
                allGazePointsRef.current.map(p => p.timestamp)
            );

            latestPoints.forEach(point => {
                if (!existingTimestamps.has(point.timestamp)) {
                    allGazePointsRef.current.push({
                        ...point,
                        scrollY: window.scrollY,
                        scrollX: window.scrollX
                    });
                }
            });
        }
    }, [gazeMetrics?.gazeSequence, isRecording]);

    // Track fallacy interactions and explanation depth
    useEffect(() => {
        if (!fallacyChatList || !isRecording) return;

        const levelToNum = { 'L1': 1, 'L2': 2, 'L3': 3 };

        Object.entries(fallacyChatList).forEach(([key, value]) => {
            if (value?.open) {
                // Track open event if not already open
                if (!openFallaciesRef.current.has(key)) {
                    const now = Date.now();
                    openFallaciesRef.current.add(key);
                    annotationOpenTimesRef.current[key] = now;  // Record when opened

                    fallacyInteractionsRef.current.push({
                        timestamp: now,
                        fallacyKey: key,
                        fallacyName: value.name,
                        action: 'open',
                        level: value.level
                    });

                    // Initialize reading time tracking for this fallacy if not exists
                    if (!annotationReadingTimeRef.current[key]) {
                        annotationReadingTimeRef.current[key] = {
                            fallacyName: value.name,
                            totalReadingTimeMs: 0,
                            readingSessions: 0,
                            sessions: []  // Track each open/close session
                        };
                    }
                }

                // Track explanation depth changes
                const currentLevel = value.level;
                const currentDepth = levelToNum[currentLevel] || 1;
                const prevDepth = explanationDepthRef.current[key]?.maxDepth || 0;

                if (currentDepth > prevDepth) {
                    // Record level change
                    fallacyInteractionsRef.current.push({
                        timestamp: Date.now(),
                        fallacyKey: key,
                        fallacyName: value.name,
                        action: 'level_change',
                        level: currentLevel,
                        previousLevel: prevDepth > 0 ? `L${prevDepth}` : null
                    });

                    // Update max depth
                    explanationDepthRef.current[key] = {
                        fallacyName: value.name,
                        maxDepth: currentDepth,
                        maxLevel: currentLevel,
                        firstReachedAt: explanationDepthRef.current[key]?.firstReachedAt || Date.now()
                    };
                }
            } else {
                // Track close event if was previously open
                if (openFallaciesRef.current.has(key)) {
                    const now = Date.now();
                    const openTime = annotationOpenTimesRef.current[key];
                    const readingDuration = openTime ? now - openTime : 0;

                    openFallaciesRef.current.delete(key);
                    delete annotationOpenTimesRef.current[key];

                    // Update reading time stats
                    if (annotationReadingTimeRef.current[key]) {
                        annotationReadingTimeRef.current[key].totalReadingTimeMs += readingDuration;
                        annotationReadingTimeRef.current[key].readingSessions += 1;
                        annotationReadingTimeRef.current[key].sessions.push({
                            openedAt: openTime,
                            closedAt: now,
                            durationMs: readingDuration
                        });
                    }

                    fallacyInteractionsRef.current.push({
                        timestamp: now,
                        fallacyKey: key,
                        fallacyName: value.name,
                        action: 'close',
                        level: value.level,
                        readingDurationMs: readingDuration  // Include duration in close event
                    });
                }
            }
        });
    }, [fallacyChatList, isRecording]);

    // Generate comprehensive export data
    const generateExportData = useCallback(() => {
        const sessionEndTime = Date.now();

        return {
            metadata: {
                participantId: participantId || `participant_${Date.now()}`,
                sessionStartTime,
                sessionEndTime,
                sessionDuration: sessionEndTime - sessionStartTime,
                exportTimestamp: new Date().toISOString(),
                articleTitle: articleInfo?.title || 'Unknown',
                articleSource: articleInfo?.source || 'Unknown',
                group: new URLSearchParams(window.location.search).get('g') === '0' ? 'control' : 'treatment',
                userAgent: navigator.userAgent,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height
            },
            readingMetrics: {
                totalReadTime: gazeMetrics?.totalReadTime || 0,
                sentenceDwellTimes: gazeMetrics?.sentenceDwellTimes || {},
                paragraphDwellTimes: gazeMetrics?.paragraphDwellTimes || {},
                fallacyDwellTimes: gazeMetrics?.fallacyDwellTimes || {},
                chartDwellTimes: gazeMetrics?.chartDwellTimes || {},
                tagDwellTimes: gazeMetrics?.tagDwellTimes || {},
                currentFocus: gazeMetrics?.currentFocus
            },
            gazeData: {
                totalPoints: allGazePointsRef.current.length,
                points: allGazePointsRef.current
            },
            scrollEvents: {
                totalEvents: scrollEventsRef.current.length,
                events: scrollEventsRef.current
            },
            clickEvents: {
                totalClicks: clickEventsRef.current.length,
                events: clickEventsRef.current
            },
            fallacyInteractions: {
                totalInteractions: fallacyInteractionsRef.current.length,
                interactions: fallacyInteractionsRef.current
            },
            explanationDepth: {
                perFallacy: explanationDepthRef.current,
                summary: {
                    totalFallaciesViewed: Object.keys(explanationDepthRef.current).length,
                    reachedL2: Object.values(explanationDepthRef.current).filter(d => d.maxDepth >= 2).length,
                    reachedL3: Object.values(explanationDepthRef.current).filter(d => d.maxDepth >= 3).length,
                    avgMaxDepth: Object.values(explanationDepthRef.current).length > 0
                        ? Object.values(explanationDepthRef.current).reduce((sum, d) => sum + d.maxDepth, 0) / Object.values(explanationDepthRef.current).length
                        : 0
                }
            },
            annotationReadingTime: {
                perFallacy: annotationReadingTimeRef.current,
                summary: {
                    totalAnnotationsRead: Object.keys(annotationReadingTimeRef.current).length,
                    totalReadingTimeMs: Object.values(annotationReadingTimeRef.current).reduce((sum, d) => sum + d.totalReadingTimeMs, 0),
                    totalReadingSessions: Object.values(annotationReadingTimeRef.current).reduce((sum, d) => sum + d.readingSessions, 0),
                    avgReadingTimePerAnnotationMs: Object.keys(annotationReadingTimeRef.current).length > 0
                        ? Object.values(annotationReadingTimeRef.current).reduce((sum, d) => sum + d.totalReadingTimeMs, 0) / Object.keys(annotationReadingTimeRef.current).length
                        : 0,
                    avgReadingTimePerSessionMs: Object.values(annotationReadingTimeRef.current).reduce((sum, d) => sum + d.readingSessions, 0) > 0
                        ? Object.values(annotationReadingTimeRef.current).reduce((sum, d) => sum + d.totalReadingTimeMs, 0) / Object.values(annotationReadingTimeRef.current).reduce((sum, d) => sum + d.readingSessions, 0)
                        : 0
                }
            },
            viewportChanges: viewportChangesRef.current
        };
    }, [participantId, sessionStartTime, gazeMetrics, articleInfo]);

    // Clear all data for new session
    const clearAllData = useCallback(() => {
        allGazePointsRef.current = [];
        scrollEventsRef.current = [];
        clickEventsRef.current = [];
        fallacyInteractionsRef.current = [];
        viewportChangesRef.current = [];
        explanationDepthRef.current = {};
        openFallaciesRef.current = new Set();
        annotationOpenTimesRef.current = {};
        annotationReadingTimeRef.current = {};
    }, []);

    // Export as JSON with save dialog
    const exportJSON = useCallback(async () => {
        const data = generateExportData();
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });

        // Try to use File System Access API for save dialog
        if ('showSaveFilePicker' in window) {
            try {
                const suggestedName = participantId
                    ? `${participantId}.json`
                    : `participant_${Date.now()}.json`;

                const handle = await window.showSaveFilePicker({
                    suggestedName: suggestedName,
                    startIn: 'downloads',
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });

                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();

                message.success('Study data saved successfully');
                clearAllData();
                setShowExportModal(false);
                onExportComplete?.();
                return;
            } catch (err) {
                // User cancelled or API failed - fall back to download
                if (err.name === 'AbortError') {
                    return; // User cancelled, don't proceed
                }
                console.warn('Save dialog failed, falling back to download:', err);
            }
        }

        // Fallback: auto-download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `skeptik_study_${data.metadata.participantId}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        message.success('Study data exported as JSON');
        clearAllData();
        setShowExportModal(false);
        onExportComplete?.();
    }, [generateExportData, clearAllData, onExportComplete, participantId]);

    // Export as CSV (multiple files zipped or separate)
    const exportCSV = useCallback(() => {
        const data = generateExportData();

        // Gaze points CSV
        const gazeCSV = [
            'timestamp,elementId,positionX,positionY,scrollX,scrollY',
            ...data.gazeData.points.map(p =>
                `${p.timestamp},${p.elementId || ''},${p.position?.x || ''},${p.position?.y || ''},${p.scrollX || 0},${p.scrollY || 0}`
            )
        ].join('\n');

        // Scroll events CSV
        const scrollCSV = [
            'timestamp,scrollX,scrollY,viewportHeight,viewportWidth,documentHeight',
            ...data.scrollEvents.events.map(e =>
                `${e.timestamp},${e.scrollX},${e.scrollY},${e.viewportHeight},${e.viewportWidth},${e.documentHeight}`
            )
        ].join('\n');

        // Click events CSV
        const clickCSV = [
            'timestamp,elementId,elementType,fallacyType,scrollY,clickX,clickY',
            ...data.clickEvents.events.map(e =>
                `${e.timestamp},${e.elementId || ''},${e.elementType},${e.fallacyType || ''},${e.scrollY},${e.clickX},${e.clickY}`
            )
        ].join('\n');

        // Dwell times CSV
        const dwellCSV = [
            'elementId,dwellTimeMs,type',
            ...Object.entries(data.readingMetrics.sentenceDwellTimes).map(([id, time]) =>
                `${id},${time},sentence`
            ),
            ...Object.entries(data.readingMetrics.paragraphDwellTimes).map(([id, time]) =>
                `${id},${time},paragraph`
            )
        ].join('\n');

        // Download each CSV
        const downloadCSV = (content, filename) => {
            const blob = new Blob([content], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };

        const prefix = `${data.metadata.participantId}_${Date.now()}`;
        downloadCSV(gazeCSV, `${prefix}_gaze.csv`);
        downloadCSV(scrollCSV, `${prefix}_scroll.csv`);
        downloadCSV(clickCSV, `${prefix}_clicks.csv`);
        downloadCSV(dwellCSV, `${prefix}_dwell.csv`);

        message.success('Study data exported as CSV files');
        clearAllData();
        setShowExportModal(false);
        onExportComplete?.();
    }, [generateExportData, clearAllData, onExportComplete]);

    if (!enabled) return null;

    return (
        <>
            <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => setShowExportModal(true)}
                style={{
                    position: 'fixed',
                    bottom: 20,
                    left: 20,
                    zIndex: 1000,
                    backgroundColor: '#3d5a6c',
                    borderColor: '#3d5a6c'
                }}
            >
                Export Study Data
            </Button>

            <Modal
                title="Export Study Data"
                open={showExportModal}
                onCancel={() => setShowExportModal(false)}
                footer={null}
                width={500}
            >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <Text strong>Filename:</Text>
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="Enter filename (e.g., participant_001)"
                            value={participantId}
                            onChange={(e) => setParticipantId(e.target.value)}
                            style={{ marginTop: 8 }}
                            addonAfter=".json"
                        />
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                            A save dialog will open. Navigate to Dropbox/skeptik eye tracking data folder.
                        </Text>
                    </div>

                    <Divider />

                    <div>
                        <Title level={5}>Data Summary</Title>
                        <Text>Gaze Points: {allGazePointsRef.current.length}</Text><br/>
                        <Text>Scroll Events: {scrollEventsRef.current.length}</Text><br/>
                        <Text>Click Events: {clickEventsRef.current.length}</Text><br/>
                        <Text>Fallacy Interactions: {fallacyInteractionsRef.current.length}</Text><br/>
                        <Text>Annotations Read: {Object.keys(annotationReadingTimeRef.current).length}</Text><br/>
                        <Text>Total Annotation Reading Time: {Math.round(Object.values(annotationReadingTimeRef.current).reduce((sum, d) => sum + d.totalReadingTimeMs, 0) / 1000)}s</Text><br/>
                        <Text>Session Duration: {Math.round((Date.now() - sessionStartTime) / 1000)}s</Text>
                    </div>

                    <Divider />

                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Button
                            type="primary"
                            block
                            onClick={exportJSON}
                            icon={<DownloadOutlined />}
                        >
                            Export as JSON (Complete Data)
                        </Button>
                        <Button
                            block
                            onClick={exportCSV}
                            icon={<DownloadOutlined />}
                        >
                            Export as CSV (Separate Files)
                        </Button>
                        <Button
                            danger
                            block
                            onClick={() => {
                                clearAllData();
                                setShowExportModal(false);
                            }}
                        >
                            Clear Data & Start New Session
                        </Button>
                    </Space>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Recording: {isRecording ? 'Active' : 'Paused'} |
                        Export includes all gaze data, scroll events, clicks, and reading metrics.
                    </Text>
                </Space>
            </Modal>
        </>
    );
}

export default StudyDataExporter;
