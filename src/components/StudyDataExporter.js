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
    enabled = true
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
            const tagEl = target.closest?.('.underline_minimap');

            if (sentenceEl || fallacyEl || tagEl) {
                clickEventsRef.current.push({
                    timestamp: Date.now(),
                    elementId: sentenceEl?.id || fallacyEl?.id || tagEl?.id,
                    elementType: tagEl ? 'fallacy-tag' : (fallacyEl ? 'fallacy-text' : 'sentence'),
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

    // Track fallacy interactions
    useEffect(() => {
        if (!fallacyChatList || !isRecording) return;

        Object.entries(fallacyChatList).forEach(([key, value]) => {
            if (value?.open) {
                // Check if we already recorded this opening
                const lastInteraction = fallacyInteractionsRef.current
                    .filter(i => i.fallacyKey === key && i.action === 'open')
                    .pop();

                if (!lastInteraction || Date.now() - lastInteraction.timestamp > 1000) {
                    fallacyInteractionsRef.current.push({
                        timestamp: Date.now(),
                        fallacyKey: key,
                        fallacyName: value.name,
                        action: 'open',
                        level: value.level
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
                userAgent: navigator.userAgent,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height
            },
            readingMetrics: {
                totalReadTime: gazeMetrics?.totalReadTime || 0,
                sentenceDwellTimes: gazeMetrics?.sentenceDwellTimes || {},
                paragraphDwellTimes: gazeMetrics?.paragraphDwellTimes || {},
                fallacyDwellTimes: gazeMetrics?.fallacyDwellTimes || {},
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
            viewportChanges: viewportChangesRef.current
        };
    }, [participantId, sessionStartTime, gazeMetrics, articleInfo]);

    // Export as JSON
    const exportJSON = useCallback(() => {
        const data = generateExportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `skeptik_study_${data.metadata.participantId}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        message.success('Study data exported as JSON');
    }, [generateExportData]);

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
    }, [generateExportData]);

    // Clear all data for new session
    const clearAllData = useCallback(() => {
        allGazePointsRef.current = [];
        scrollEventsRef.current = [];
        clickEventsRef.current = [];
        fallacyInteractionsRef.current = [];
        viewportChangesRef.current = [];
        message.info('All study data cleared');
    }, []);

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
                        <Text strong>Participant ID:</Text>
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="Enter participant ID"
                            value={participantId}
                            onChange={(e) => setParticipantId(e.target.value)}
                            style={{ marginTop: 8 }}
                        />
                    </div>

                    <Divider />

                    <div>
                        <Title level={5}>Data Summary</Title>
                        <Text>Gaze Points: {allGazePointsRef.current.length}</Text><br/>
                        <Text>Scroll Events: {scrollEventsRef.current.length}</Text><br/>
                        <Text>Click Events: {clickEventsRef.current.length}</Text><br/>
                        <Text>Fallacy Interactions: {fallacyInteractionsRef.current.length}</Text><br/>
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
