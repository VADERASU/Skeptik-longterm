"""
Gazepoint WebSocket Bridge Server

This server connects to Gazepoint Control via TCP and streams
gaze data to the web browser via WebSocket.

Requirements:
    pip install websockets lxml

Usage:
    1. Start Gazepoint Control (with eye tracker connected)
    2. Run: python gazepoint_bridge.py
    3. The web app will connect to ws://localhost:8765
"""

import asyncio
import socket
import threading
import json
import time
from queue import Queue
import lxml.etree as etree

# Try to import websockets
try:
    import websockets
except ImportError:
    print("Please install websockets: pip install websockets")
    exit(1)


class GazepointClient:
    """Client to connect to Gazepoint Control via TCP."""

    def __init__(self, host='127.0.0.1', port=4242):
        self.host = host
        self.port = port
        self._sock = None
        self._running = False
        self._thread = None
        self._data_queue = Queue()
        self._current_data = {}
        self._lock = threading.Lock()

    def connect(self):
        """Establish TCP connection to Gazepoint Control."""
        try:
            self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._sock.connect((self.host, self.port))
            self._sock.settimeout(1.0)
            print(f"Connected to Gazepoint Control at {self.host}:{self.port}")
            return True
        except Exception as e:
            print(f"Failed to connect to Gazepoint: {e}")
            print("Make sure Gazepoint Control is running!")
            return False

    def _send_command(self, command, id_name, values=None):
        """Send XML command to Gazepoint."""
        xml = f'<{command.upper()} ID="{id_name.upper()}" '
        if values:
            for key, val in values.items():
                xml += f'{key.upper()}="{val}" '
        xml += '/>\r\n'
        self._sock.send(xml.encode())

    def enable_data_stream(self):
        """Enable the data stream from Gazepoint."""
        # Enable sending data records
        self._send_command('SET', 'ENABLE_SEND_DATA', {'STATE': '1'})

        # Enable specific data fields
        # BPOG = Best Point of Gaze (combined both eyes)
        self._send_command('SET', 'ENABLE_SEND_POG_BEST', {'STATE': '1'})

        # Fixation data
        self._send_command('SET', 'ENABLE_SEND_POG_FIX', {'STATE': '1'})

        # Pupil data (optional - for attention/engagement metrics)
        self._send_command('SET', 'ENABLE_SEND_PUPIL_LEFT', {'STATE': '1'})
        self._send_command('SET', 'ENABLE_SEND_PUPIL_RIGHT', {'STATE': '1'})

        # Time counter
        self._send_command('SET', 'ENABLE_SEND_TIME', {'STATE': '1'})

        print("Data stream enabled")

    def _parse_record(self, xml_str):
        """Parse a REC XML record from Gazepoint."""
        try:
            # Clean up the XML string
            xml_str = xml_str.strip()
            if not xml_str.startswith('<REC'):
                return None

            root = etree.fromstring(xml_str.encode())
            data = {}

            # Best Point of Gaze (normalized 0-1)
            if 'BPOGX' in root.attrib:
                data['x'] = float(root.attrib['BPOGX'])
            if 'BPOGY' in root.attrib:
                data['y'] = float(root.attrib['BPOGY'])
            if 'BPOGV' in root.attrib:
                data['valid'] = root.attrib['BPOGV'] == '1'

            # Fixation data
            if 'FPOGX' in root.attrib:
                data['fix_x'] = float(root.attrib['FPOGX'])
            if 'FPOGY' in root.attrib:
                data['fix_y'] = float(root.attrib['FPOGY'])
            if 'FPOGD' in root.attrib:
                data['fix_duration'] = float(root.attrib['FPOGD'])
            if 'FPOGV' in root.attrib:
                data['fix_valid'] = root.attrib['FPOGV'] == '1'

            # Pupil diameter (mm)
            if 'LPMM' in root.attrib:
                data['pupil_left'] = float(root.attrib['LPMM'])
            if 'RPMM' in root.attrib:
                data['pupil_right'] = float(root.attrib['RPMM'])

            # Timestamp
            if 'TIME' in root.attrib:
                data['time'] = float(root.attrib['TIME'])

            return data
        except Exception as e:
            return None

    def _receive_loop(self):
        """Background thread to receive data from Gazepoint."""
        buffer = ""
        while self._running:
            try:
                chunk = self._sock.recv(4096).decode()
                buffer += chunk

                # Process complete XML records
                while '\r\n' in buffer:
                    line, buffer = buffer.split('\r\n', 1)
                    if line.startswith('<REC'):
                        data = self._parse_record(line)
                        if data:
                            with self._lock:
                                self._current_data = data
                            self._data_queue.put(data)
            except socket.timeout:
                continue
            except Exception as e:
                if self._running:
                    print(f"Receive error: {e}")
                break

    def start(self):
        """Start receiving data in background thread."""
        self._running = True
        self._thread = threading.Thread(target=self._receive_loop, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop receiving data."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)
        if self._sock:
            self._sock.close()

    def get_current_gaze(self):
        """Get the most recent gaze data."""
        with self._lock:
            return self._current_data.copy()


# Global Gazepoint client
gp_client = None

class DemoGazeSimulator:
    """Simulates gaze data for testing without eye tracker."""

    def __init__(self):
        self.x = 0.5
        self.y = 0.3
        self.vx = 0.001
        self.vy = 0.002
        self.start_time = time.time()

    def get_current_gaze(self):
        """Generate simulated gaze data moving across screen."""
        import math
        import random

        t = time.time() - self.start_time

        # Simulate reading behavior - horizontal sweep with vertical drift
        self.x = 0.2 + 0.6 * ((t * 0.05) % 1)  # Sweep left to right
        self.y = 0.2 + 0.1 * math.sin(t * 0.5) + 0.3 * ((t * 0.01) % 1)

        # Add some noise
        self.x += random.gauss(0, 0.01)
        self.y += random.gauss(0, 0.01)

        # Clamp to screen
        self.x = max(0.05, min(0.95, self.x))
        self.y = max(0.05, min(0.95, self.y))

        return {
            'x': self.x,
            'y': self.y,
            'valid': True,
            'fix_x': self.x,
            'fix_y': self.y,
            'fix_duration': random.uniform(0.1, 0.5),
            'fix_valid': True,
            'time': t
        }


async def gaze_handler(websocket, path=None):
    """Handle WebSocket connections from the web app."""
    print(f"Web client connected")

    # Use demo simulator if no real client
    data_source = gp_client if gp_client else DemoGazeSimulator()

    try:
        while True:
            gaze_data = data_source.get_current_gaze()
            if gaze_data:
                await websocket.send(json.dumps(gaze_data))
            await asyncio.sleep(0.016)  # ~60 FPS
    except websockets.exceptions.ConnectionClosed:
        print("Web client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")


async def main():
    """Main entry point."""
    global gp_client

    print("=" * 50)
    print("Gazepoint WebSocket Bridge Server")
    print("=" * 50)

    # Connect to Gazepoint
    gp_client = GazepointClient()

    if not gp_client.connect():
        print("\nRunning in DEMO MODE (simulated gaze data)")
        print("For real eye tracking, start Gazepoint Control first.\n")
        gp_client = None
    else:
        gp_client.enable_data_stream()
        gp_client.start()

    # Start WebSocket server
    print(f"\nStarting WebSocket server on ws://localhost:8765")
    print("Waiting for web app to connect...\n")

    async with websockets.serve(gaze_handler, "localhost", 8765):
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down...")
        if gp_client:
            gp_client.stop()
