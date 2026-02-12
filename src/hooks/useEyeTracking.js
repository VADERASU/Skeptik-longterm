import { useState, useEffect, useRef, useCallback } from 'react';
import * as webgazer from 'webgazer';

export const useEyeTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [gazePoint, setGazePoint] = useState({ x: null, y: null });
  const [gazeData, setGazeData] = useState([]);
  const [error, setError] = useState(null);
  const gazeDataRef = useRef([]);
  const trackingRef = useRef(false);
  const webgazerRef = useRef(null);
  const listenerRef = useRef(null);
  const calibrationPointsRef = useRef([]);
  const isCalibratingRef = useRef(false);
  const gazePointRef = useRef({ x: null, y: null });

  // Initialize webgazer
  useEffect(() => {
    console.log('WebGazer module:', webgazer);
    
    return () => {
      if (trackingRef.current && webgazerRef.current) {
        try {
          console.log('Cleaning up WebGazer');
          webgazerRef.current.end();
        } catch (e) {
          console.log('WebGazer already stopped');
        }
      }
    };
  }, []);

  const startTracking = useCallback(async () => {
    if (trackingRef.current) {
      console.log('Already tracking');
      return;
    }

    try {
      console.log('Starting WebGazer tracking...');
      setError(null);
      
      // Get webgazer instance
      const wg = webgazer.default || webgazer;
      console.log('WebGazer instance:', wg);
      
      if (!wg) {
        throw new Error('WebGazer not loaded');
      }

      // Set up gaze listener
      const gazeListener = (data, elapsedTime) => {
        if (data == null) return;
        
        console.log('Gaze data received:', data);
        
        setGazePoint({
          x: data.x,
          y: data.y,
          timestamp: Date.now()
        });

        // Update ref for calibration sampling
        gazePointRef.current = {
          x: data.x,
          y: data.y,
          timestamp: Date.now()
        };

        // Store gaze data for export ONLY if not calibrating
        if (!isCalibratingRef.current) {
          gazeDataRef.current.push({
            x: data.x,
            y: data.y,
            timestamp: Date.now(),
            elapsedTime
          });
        }
      };

      listenerRef.current = gazeListener;
      
      // Set gaze listener
      if (wg.setGazeListener) {
        wg.setGazeListener(gazeListener);
      }
      
      // Start tracking
      console.log('Calling wg.begin()...');
      await wg.begin();
      console.log('WebGazer tracking started successfully');

      webgazerRef.current = wg;
      trackingRef.current = true;
      setIsTracking(true);
      setIsCalibrated(false);
    } catch (error) {
      console.error('Error starting eye tracking:', error);
      setError(error.message || 'Failed to start tracking. Check browser console and ensure webcam permission is granted.');
      setIsTracking(false);
    }
  }, []);

  const stopTracking = useCallback(() => {
    try {
      console.log('Stopping WebGazer tracking...');
      if (webgazerRef.current) {
        webgazerRef.current.end();
      }
      trackingRef.current = false;
      setIsTracking(false);
      setGazePoint({ x: null, y: null });
      setError(null);
    } catch (error) {
      console.error('Error stopping eye tracking:', error);
    }
  }, []);

  const calibrate = useCallback(() => {
    if (!trackingRef.current) {
      console.warn('Start tracking before calibration');
      setError('Start tracking first');
      return;
    }
    
    if (webgazerRef.current) {
      try {
        console.log('Starting calibration...');
        // Show video feedback
        if (webgazerRef.current.showVideo) {
          webgazerRef.current.showVideo();
        }
        if (webgazerRef.current.showPredictionPoints) {
          webgazerRef.current.showPredictionPoints(true);
        }
        calibrationPointsRef.current = [];
        setError(null);
      } catch (e) {
        console.log('Calibration methods not available:', e);
      }
    }
  }, []);

  const addCalibrationPoint = useCallback((x, y) => {
    if (!webgazerRef.current) {
      console.warn('WebGazer not initialized');
      return;
    }

    try {
      console.log(`Adding calibration point at (${x}, ${y})`);
      
      // Try different API methods for adding calibration points
      if (webgazerRef.current.addCalibrationPoint) {
        webgazerRef.current.addCalibrationPoint(x, y);
        console.log('Calibration point added via addCalibrationPoint');
      } else if (webgazerRef.current.calibrationPoint) {
        webgazerRef.current.calibrationPoint(x, y);
        console.log('Calibration point added via calibrationPoint');
      } else {
        console.log('No calibration point method available, but point recorded');
      }

      // Track calibration points
      calibrationPointsRef.current.push({ x, y, timestamp: Date.now() });
      console.log(`Calibration points recorded: ${calibrationPointsRef.current.length}`);

    } catch (e) {
      console.error('Error adding calibration point:', e);
    }
  }, []);

  const collectCalibrationSamples = useCallback(async (x, y) => {
    if (!webgazerRef.current) {
      console.warn('WebGazer not initialized');
      return;
    }

    try {
      console.log(`Starting to collect calibration samples at (${x}, ${y}) for 600ms...`);
      isCalibratingRef.current = true;
      let sampleCount = 0;
      
      const start = Date.now();
      while (Date.now() - start < 600) {
        // Use current gaze point
        if (gazePointRef.current.x && gazePointRef.current.y) {
          addCalibrationPoint(x, y);
          sampleCount++;
        }
        await new Promise(r => setTimeout(r, 50));
      }

      isCalibratingRef.current = false;
      console.log(`Collected ${sampleCount} calibration samples at (${x}, ${y})`);
      console.log(`Total calibration points recorded: ${calibrationPointsRef.current.length}`);
      
      // After many samples, mark as calibrated
      if (calibrationPointsRef.current.length >= 45) {
        console.log('Calibration complete - 45+ points recorded');
        setIsCalibrated(true);
      }

    } catch (e) {
      isCalibratingRef.current = false;
      console.error('Error collecting calibration samples:', e);
    }
  }, [addCalibrationPoint]);

  const endCalibration = useCallback(() => {
    if (webgazerRef.current) {
      try {
        console.log('Ending calibration...');
        
        // Try to end calibration
        if (webgazerRef.current.hidePredictionPoints) {
          webgazerRef.current.hidePredictionPoints(true);
        }
        if (webgazerRef.current.hideVideo) {
          webgazerRef.current.hideVideo();
        }
        
        console.log(`Calibration ended with ${calibrationPointsRef.current.length} points recorded`);
      } catch (e) {
        console.log('Hide methods not available:', e);
      }
    }
  }, []);

  const exportData = useCallback(() => {
    const dataToExport = gazeDataRef.current;
    const csv = convertToCSV(dataToExport);
    downloadCSV(csv, 'gaze-tracking-data.csv');
    
    return dataToExport;
  }, []);

  const clearData = useCallback(() => {
    gazeDataRef.current = [];
    setGazeData([]);
  }, []);

  const getGazeData = useCallback(() => {
    return gazeDataRef.current;
  }, []);

  const getCalibrationPoints = useCallback(() => {
    return calibrationPointsRef.current;
  }, []);

  return {
    isTracking,
    isCalibrated,
    gazePoint,
    gazeData: gazeDataRef.current,
    error,
    startTracking,
    stopTracking,
    calibrate,
    addCalibrationPoint,
    collectCalibrationSamples,
    endCalibration,
    exportData,
    clearData,
    getGazeData,
    getCalibrationPoints
  };
};

// Helper functions
const convertToCSV = (data) => {
  if (data.length === 0) return 'x,y,timestamp,elapsedTime\n';
  
  const headers = ['x', 'y', 'timestamp', 'elapsedTime'];
  const rows = data.map(d => [d.x, d.y, d.timestamp, d.elapsedTime].join(','));
  
  return [headers.join(','), ...rows].join('\n');
};

const downloadCSV = (csv, filename) => {
  const element = document.createElement('a');
  const file = new Blob([csv], { type: 'text/csv' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
