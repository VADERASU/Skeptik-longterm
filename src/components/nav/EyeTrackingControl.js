import React from 'react';
import { Button, Space, Tooltip, Tag, Row, Col, Alert } from 'antd';
import { EyeOutlined, StopOutlined, CameraOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';

export const EyeTrackingControl = ({ 
  isTracking, 
  isCalibrated, 
  gazePoint,
  error,
  onStartTracking, 
  onStopTracking, 
  onCalibrate,
  onEndCalibration,
  onExport,
  onClear,
  dataCount
}) => {
  const containerStyle = css`
    padding: 12px 16px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background-color: #fafafa;
    margin-bottom: 16px;
  `;

  const statusStyle = css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `;

  return (
    <div className={containerStyle}>
      {error && (
        <Alert 
          message="Eye Tracking Error" 
          description={error} 
          type="error" 
          closable 
          style={{ marginBottom: '12px' }}
        />
      )}
      
      <div className={statusStyle}>
        <EyeOutlined style={{ fontSize: '16px' }} />
        <span style={{ fontWeight: '500' }}>Eye Tracking Control</span>
        {isTracking && <Tag color="blue">Tracking</Tag>}
        {isCalibrated && <Tag color="green">Calibrated</Tag>}
        {gazePoint.x && (
          <Tag color="purple">
            Gaze: ({Math.round(gazePoint.x)}, {Math.round(gazePoint.y)})
          </Tag>
        )}
        {dataCount > 0 && <Tag color="orange">Data points: {dataCount}</Tag>}
      </div>

      <Row gutter={[8, 8]}>
        <Col>
          {!isTracking ? (
            <Tooltip title="Start eye tracking (requires webcam permission)">
              <Button 
                type="primary" 
                onClick={onStartTracking}
                icon={<EyeOutlined />}
              >
                Start Tracking
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Stop eye tracking">
              <Button 
                danger 
                onClick={onStopTracking}
                icon={<StopOutlined />}
              >
                Stop Tracking
              </Button>
            </Tooltip>
          )}
        </Col>

        <Col>
          <Tooltip title="Calibrate: Click 5 points on screen for accuracy">
            <Button 
              disabled={!isTracking}
              onClick={isCalibrated ? onEndCalibration : onCalibrate}
              icon={<CameraOutlined />}
              style={{ 
                backgroundColor: isCalibrated ? '#52c41a' : undefined,
                color: isCalibrated ? 'white' : undefined
              }}
            >
              {isCalibrated ? 'End Calibration' : 'Calibrate'}
            </Button>
          </Tooltip>
        </Col>

        <Col>
          <Tooltip title="Export gaze data as CSV">
            <Button 
              disabled={dataCount === 0}
              onClick={onExport}
              icon={<DownloadOutlined />}
            >
              Export Data
            </Button>
          </Tooltip>
        </Col>

        <Col>
          <Tooltip title="Clear collected data">
            <Button 
              disabled={dataCount === 0}
              danger
              onClick={onClear}
              icon={<DeleteOutlined />}
            >
              Clear
            </Button>
          </Tooltip>
        </Col>
      </Row>

      <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
        <p>💡 Tip: Start tracking, calibrate by clicking 5 points, then read the article. Gaze data is collected in real-time.</p>
      </div>
    </div>
  );
};
