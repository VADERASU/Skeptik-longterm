import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Row, Col, Steps, Space, message } from 'antd';
import { EyeOutlined, CheckCircleOutlined, CameraOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';

export const EyeTrackingCalibration = ({ 
  isTracking, 
  isCalibrated,
  onStartTracking,
  onCalibrate,
  onCollectCalibrationSamples,
  onEndCalibration,
  onCalibrationComplete
}) => {
  const [currentCalibrationPoint, setCurrentCalibrationPoint] = useState(null);
  const [clickCount, setClickCount] = useState(0);
  const calibrationPointsRef = useRef(0);
  const calibrationTimerRef = useRef(null);
  const clicksPerPoint = 3; // Click each point 3 times

  // 9-point calibration grid (3x3)
  const calibrationPoints = [
    // Top row
    { x: '10%', y: '10%', num: 1 },
    { x: '50%', y: '10%', num: 2 },
    { x: '90%', y: '10%', num: 3 },
    // Middle row
    { x: '10%', y: '50%', num: 4 },
    { x: '50%', y: '50%', num: 5 },
    { x: '90%', y: '50%', num: 6 },
    // Bottom row
    { x: '10%', y: '90%', num: 7 },
    { x: '50%', y: '90%', num: 8 },
    { x: '90%', y: '90%', num: 9 }
  ];

  useEffect(() => {
    return () => {
      if (calibrationTimerRef.current) {
        clearTimeout(calibrationTimerRef.current);
      }
    };
  }, []);

  const containerStyle = css`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
  `;

  const cardStyle = css`
    width: 100%;
    max-width: 600px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border-radius: 12px;
  `;

  const headerStyle = css`
    text-align: center;
    margin-bottom: 30px;
    color: #1f1f1f;
  `;

  const iconStyle = css`
    font-size: 48px;
    color: #667eea;
    margin-bottom: 16px;
  `;

  const instructionStyle = css`
    background-color: #f5f5f5;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    font-size: 14px;
    line-height: 1.8;
    color: #333;
  `;

  const fullScreenCalibrationStyle = css`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9998;
  `;

  const calibrationDotStyle = (x, y) => css`
    position: absolute;
    left: ${x};
    top: ${y};
    transform: translate(-50%, -50%);
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #ff6b6b, #ff4757);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 36px;
    box-shadow: 0 8px 25px rgba(255, 71, 87, 0.4);
    border: 4px solid white;

    &:hover {
      transform: translate(-50%, -50%) scale(1.15);
      box-shadow: 0 12px 35px rgba(255, 71, 87, 0.6);
    }

    &:active {
      transform: translate(-50%, -50%) scale(0.95);
    }
  `;

  const handleCalibrationStart = () => {
    if (!isTracking) {
      message.info('Starting eye tracking...');
      onStartTracking();
    }
  };

  const handleCalibrateStart = () => {
    calibrationPointsRef.current = 0;
    message.info('Look at each red dot and click it. Starting in 2 seconds...');
    onCalibrate();
    
    // Show first calibration point after 2 seconds
    calibrationTimerRef.current = setTimeout(() => {
      setCurrentCalibrationPoint(0);
    }, 2000);
  };

  const handleCalibrationPointClick = async (index) => {
    const point = calibrationPoints[index];
    // Convert percentage to pixels
    const x = (parseInt(point.x) / 100) * window.innerWidth;
    const y = (parseInt(point.y) / 100) * window.innerHeight;
    
    // Collect calibration samples for 600ms at this point
    await onCollectCalibrationSamples(x, y);
    
    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);
    
    if (newClickCount < clicksPerPoint) {
      // Same point, wait 500ms and collect again
      message.info(`Click ${newClickCount}/${clicksPerPoint} - Look again!`);
      calibrationTimerRef.current = setTimeout(() => {
        setClickCount(newClickCount);
      }, 500);
    } else if (index < calibrationPoints.length - 1) {
      // Move to next point
      setClickCount(0);
      setCurrentCalibrationPoint(null);
      calibrationTimerRef.current = setTimeout(() => {
        setCurrentCalibrationPoint(index + 1);
      }, 1000);
    } else {
      // All points and clicks complete
      setCurrentCalibrationPoint(null);
      setClickCount(0);
      message.success('Calibration complete!');
      onEndCalibration();
    }
  };

  const handleCalibrationComplete = () => {
    setCurrentCalibrationPoint(null);
    if (calibrationTimerRef.current) {
      clearTimeout(calibrationTimerRef.current);
    }
    message.success('Calibration complete! Starting main application...');
    setTimeout(() => {
      onCalibrationComplete();
    }, 1500);
  };

  const currentStep = !isTracking ? 0 : !isCalibrated ? 1 : 2;

  return (
    <>
      {currentCalibrationPoint !== null && (
        <div className={fullScreenCalibrationStyle}>
          {calibrationPoints.map((point, index) => (
            <div
              key={index}
              className={calibrationDotStyle(point.x, point.y)}
              onClick={() => handleCalibrationPointClick(index)}
              style={{
                opacity: index === currentCalibrationPoint ? 1 : 0,
                pointerEvents: index === currentCalibrationPoint ? 'auto' : 'none',
                transition: 'opacity 0.3s ease'
              }}
            >
              {point.num}
            </div>
          ))}
          <div
            style={{
              position: 'absolute',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#333',
              fontSize: '18px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          >
            <div>Point {currentCalibrationPoint + 1} of {calibrationPoints.length}</div>
            <div style={{ fontSize: '16px', marginTop: '5px' }}>
              Click {clickCount + 1} of {clicksPerPoint}
            </div>
            <div style={{ fontSize: '14px', marginTop: '8px', color: '#666' }}>
              Look at the dot and click it
            </div>
          </div>
        </div>
      )}

      <div className={containerStyle}>
        <Card className={cardStyle}>
          <div className={headerStyle}>
            <div className={iconStyle}>
              <EyeOutlined />
            </div>
            <h1 style={{ fontSize: '28px', margin: '10px 0' }}>Eye Tracking Calibration</h1>
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Set up your eye tracker for accurate results
            </p>
          </div>

          <Steps
            current={currentStep}
            items={[
              { title: 'Start Tracking', icon: <EyeOutlined /> },
              { title: 'Calibrate', icon: <CameraOutlined /> },
              { title: 'Complete', icon: <CheckCircleOutlined /> }
            ]}
            style={{ marginBottom: '30px' }}
          />

          {/* Step 1: Start Tracking */}
          {!isTracking && (
            <div>
              <div className={instructionStyle}>
                <h3 style={{ marginTop: 0, color: '#667eea' }}>Step 1: Enable Eye Tracking</h3>
                <p style={{ margin: '10px 0 0 0' }}>
                  Click the button below to start eye tracking. Your browser will ask for 
                  permission to access your webcam. This is required for accurate eye tracking.
                </p>
              </div>

              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<EyeOutlined />}
                  onClick={handleCalibrationStart}
                  style={{
                    height: '48px',
                    fontSize: '16px',
                    paddingLeft: '30px',
                    paddingRight: '30px'
                  }}
                >
                  Start Eye Tracking
                </Button>
              </div>

              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#e6f7ff',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#0050b3'
              }}>
                ℹ️ <strong>Webcam Required:</strong> Eye tracking uses your webcam. 
                Make sure it's unobstructed and well-lit.
              </div>
            </div>
          )}

          {/* Step 2: Calibration */}
          {isTracking && !isCalibrated && (
            <div>
              <div className={instructionStyle}>
                <h3 style={{ marginTop: 0, color: '#667eea' }}>Step 2: Calibration</h3>
                <p style={{ margin: '10px 0 0 0' }}>
                  Click "Start Calibration" below. Red dots will appear across a 3×3 grid on your screen. 
                  Look at each dot and click it <strong>3 times</strong> to calibrate. This helps the system learn where you're looking with high accuracy.
                </p>
              </div>

              <div style={{
                background: '#f0f2f5',
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center',
                margin: '20px 0',
                border: '1px solid #d9d9d9'
              }}>
                <p style={{ fontSize: '14px', color: '#333', marginBottom: '0px' }}>
                  <strong>What to expect:</strong> When you start calibration, 9 red dots will appear across your screen in a 3×3 grid pattern. Look at each dot and click it 3 times. The system will collect your gaze data to improve accuracy.
                </p>
              </div>

              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<CameraOutlined />}
                    onClick={handleCalibrateStart}
                    style={{
                      height: '48px',
                      fontSize: '16px',
                      width: '100%'
                    }}
                  >
                    Start Calibration
                  </Button>
                  <Button
                    onClick={handleCalibrationComplete}
                    size="large"
                    style={{
                      height: '48px',
                      fontSize: '16px',
                      width: '100%'
                    }}
                  >
                    Skip / Proceed to Main Page
                  </Button>
                </Space>
              </div>

              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#fffbe6',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#ad6800'
              }}>
                ⚠️ <strong>For Best Results:</strong> Ensure good lighting and keep your face 
                steady during calibration. Look at the center of each red dot before clicking.
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {isCalibrated && (
            <div>
              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: '20px' }} />
                <h2 style={{ color: '#52c41a', margin: '10px 0' }}>Calibration Complete!</h2>
                <p style={{ color: '#666', marginBottom: '30px' }}>
                  Your eye tracker is now ready. Click below to start analyzing articles.
                </p>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleCalibrationComplete}
                  style={{
                    height: '48px',
                    fontSize: '16px',
                    paddingLeft: '50px',
                    paddingRight: '50px'
                  }}
                >
                  Proceed to Article Analysis
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};
