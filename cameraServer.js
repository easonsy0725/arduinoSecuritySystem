const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Update this to your Arduino's port
const ARDUINO_PORT = '/dev/tty.usbmodem101'; // Mac
// const ARDUINO_PORT = 'COM3'; // Windows

// Initialize serial port
const port = new SerialPort({
  path: ARDUINO_PORT,
  baudRate: 9600
});

// Initialize parser
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

let latestStatus = {
  systemOn: false,
  distance: 0,
  doorOpen: false
};

let photos = []; // Store simulated photos

// Listen for data from Arduino
parser.on('data', (data) => {
  try {
    const json = JSON.parse(data);
    latestStatus = json;
    console.log('Status update:', json);
  } catch (e) {
    console.log('Arduino:', data);
    
    // Check if photo was taken
    if (data.trim() === 'PHOTO_TAKEN') {
      const now = new Date();
      const photo = {
        id: Date.now(),
        date: now.toLocaleDateString('en-CA'), // YYYY-MM-DD
        time: now.toLocaleTimeString('en-GB'), // HH:MM:SS
        timestamp: now.toISOString(),
        // Use placeholder image service for demo
        imageUrl: `https://picsum.photos/400/300?random=${Date.now()}`
      };
      photos.unshift(photo); // Add to beginning of array
      console.log('📸 Photo captured:', photo.date, photo.time);
    }
  }
});

// API Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    ...latestStatus,
    photoCount: photos.length
  });
});

// Turn system ON
app.post('/api/turnon', (req, res) => {
  port.write('ON\n');
  res.json({ success: true });
});

// Turn system OFF
app.post('/api/turnoff', (req, res) => {
  port.write('OFF\n');
  res.json({ success: true });
});

// Toggle system state
app.post('/api/toggle', (req, res) => {
  port.write('TOGGLE\n');
  res.json({ success: true });
});

// Get captured photos
app.get('/api/photos', (req, res) => {
  res.json(photos);
});

// Clear all photos
app.post('/api/clear', (req, res) => {
  photos = [];
  port.write('CLEAR_PHOTOS\n');
  res.json({ success: true });
});

// Serve frontend HTML
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Security Guard Control</title>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .panel {
      background: white;
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 { 
      text-align: center; 
      color: #333; 
      margin-bottom: 20px;
      font-size: 28px;
    }
    h2 {
      color: #555;
      margin-bottom: 15px;
      font-size: 20px;
    }
    .status { 
      font-size: 24px; 
      margin: 20px 0; 
      padding: 30px; 
      border-radius: 15px;
      text-align: center;
      font-weight: bold;
      transition: all 0.3s ease;
    }
    .armed { 
      background: #4CAF50; 
      color: white;
      box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
    }
    .disarmed { 
      background: #e0e0e0; 
      color: #666;
    }
    .alert { 
      background: #f44336; 
      color: white;
      animation: blink 1s infinite;
      box-shadow: 0 5px 15px rgba(244, 67, 54, 0.4);
    }
    @keyframes blink { 50% { opacity: 0.6; } }
    
    .controls {
      display: flex;
      gap: 15px;
      margin: 25px 0;
    }
    button { 
      flex: 1;
      padding: 18px;
      font-size: 18px;
      cursor: pointer;
      border-radius: 12px;
      border: none;
      color: white;
      font-weight: bold;
      transition: all 0.3s ease;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 15px rgba(0,0,0,0.3);
    }
    button:active { transform: translateY(0); }
    .on { background: linear-gradient(135deg, #4CAF50, #45a049); }
    .off { background: linear-gradient(135deg, #f44336, #da190b); }
    .clear { 
      background: linear-gradient(135deg, #ff9800, #f57c00);
      font-size: 16px;
      padding: 12px 24px;
      flex: none;
    }
    
    .data {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 12px;
      margin-top: 20px;
    }
    .data p {
      margin: 10px 0;
      color: #555;
      font-size: 16px;
    }
    .emoji { font-size: 32px; margin-bottom: 10px; }
    
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .photo-item {
      background: #f5f5f5;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      transition: transform 0.3s ease;
    }
    .photo-item:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.2);
    }
    .photo-item img {
      width: 100%;
      height: 220px;
      object-fit: cover;
      background: #e0e0e0;
    }
    .photo-info {
      padding: 15px;
      background: white;
    }
    .photo-info p {
      margin: 5px 0;
      font-size: 14px;
      color: #666;
    }
    .photo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .no-photos {
      text-align: center;
      color: #999;
      padding: 60px 20px;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="panel">
      <h1>🛡️ Security Guard Control</h1>
      <div id='status' class='status'>
        <div class="emoji">⏳</div>
        Loading...
      </div>
      <div class="controls">
        <button class='on' onclick='turnOn()'>🔓 Turn ON</button>
        <button class='off' onclick='turnOff()'>🔒 Turn OFF</button>
      </div>
      <div class='data' id='data'>
        <p>📏 Distance: -- cm</p>
        <p>🚪 Door: --</p>
        <p>📷 Photos captured: --</p>
      </div>
    </div>
    
    <div class="panel">
      <div class="photo-header">
        <h2>📸 Captured Photos (Simulated)</h2>
        <button class='clear' onclick='clearPhotos()'>🗑️ Clear All</button>
      </div>
      <div id='photos' class='photo-grid'></div>
    </div>
  </div>
  
  <script>
    function updateStatus() {
      fetch('/api/status')
        .then(r => r.json())
        .then(d => {
          let s = document.getElementById('status');
          
          if (d.doorOpen) {
            s.innerHTML = '<div class="emoji">🚨</div>ALERT - DOOR OPEN!<br><small style="font-size:16px;">Camera is capturing...</small>';
            s.className = 'status alert';
          } else if (d.systemOn) {
            s.innerHTML = '<div class="emoji">✅</div>ARMED';
            s.className = 'status armed';
          } else {
            s.innerHTML = '<div class="emoji">💤</div>DISARMED';
            s.className = 'status disarmed';
          }
          
          document.getElementById('data').innerHTML = 
            '<p>📏 Distance: ' + d.distance + ' cm</p>' +
            '<p>🚪 Door: ' + (d.doorOpen ? 'OPEN ⚠️' : 'CLOSED ✓') + '</p>' +
            '<p>📷 Photos captured: ' + d.photoCount + '</p>';
        })
        .catch(err => console.error('Error:', err));
    }
    
    function loadPhotos() {
      fetch('/api/photos')
        .then(r => r.json())
        .then(photos => {
          let html = '';
          if (photos.length === 0) {
            html = '<div class="no-photos">📷<br>No photos yet<br><small>Photos will appear here when door opens</small></div>';
          } else {
            photos.forEach(photo => {
              html += '<div class="photo-item">';
              html += '<img src="' + photo.imageUrl + '" alt="Security photo">';
              html += '<div class="photo-info">';
              html += '<p><strong>📅 ' + photo.date + '</strong></p>';
              html += '<p>🕐 ' + photo.time + '</p>';
              html += '</div></div>';
            });
          }
          document.getElementById('photos').innerHTML = html;
        })
        .catch(err => console.error('Error:', err));
    }
    
    function turnOn() { 
      fetch('/api/turnon', {method:'POST'})
        .then(() => setTimeout(updateStatus, 100)); 
    }
    
    function turnOff() { 
      fetch('/api/turnoff', {method:'POST'})
        .then(() => setTimeout(updateStatus, 100)); 
    }
    
    function clearPhotos() {
      if (confirm('Delete all photos?')) {
        fetch('/api/clear', {method:'POST'})
          .then(() => {
            loadPhotos();
            updateStatus();
          });
      }
    }
    
    setInterval(updateStatus, 500);
    setInterval(loadPhotos, 2000);
    updateStatus();
    loadPhotos();
  </script>
</body>
</html>
  `);
});

// Start server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running!`);
  console.log(`🌐 Open your browser to: http://localhost:${PORT}`);
  console.log(`🔌 Connected to Arduino on ${ARDUINO_PORT}\n`);
});

