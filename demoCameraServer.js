const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Simulated status
let simulatedStatus = {
  systemOn: false,
  distance: 25,
  doorOpen: false
};

let photos = [];

// Simulate changing distance and auto-capture photos
setInterval(() => {
  simulatedStatus.distance = Math.floor(Math.random() * 50) + 10;
  
  if (simulatedStatus.systemOn && simulatedStatus.distance < 15) {
    if (!simulatedStatus.doorOpen) {
      // Door just opened! Take photo
      const now = new Date();
      const photo = {
        id: Date.now(),
        date: now.toLocaleDateString('en-CA'),
        time: now.toLocaleTimeString('en-GB'),
        timestamp: now.toISOString(),
        imageUrl: `https://picsum.photos/400/300?random=${Date.now()}`
      };
      photos.unshift(photo);
      console.log('📸 Demo photo captured:', photo.date, photo.time);
    }
    simulatedStatus.doorOpen = true;
  } else {
    simulatedStatus.doorOpen = false;
  }
}, 2000);

app.get('/api/status', (req, res) => {
  res.json({
    ...simulatedStatus,
    photoCount: photos.length
  });
});

app.post('/api/turnon', (req, res) => {
  simulatedStatus.systemOn = true;
  console.log('System turned ON');
  res.json({ success: true });
});

app.post('/api/turnoff', (req, res) => {
  simulatedStatus.systemOn = false;
  simulatedStatus.doorOpen = false;
  console.log('System turned OFF');
  res.json({ success: true });
});

app.post('/api/toggle', (req, res) => {
  simulatedStatus.systemOn = !simulatedStatus.systemOn;
  res.json({ success: true });
});

app.get('/api/photos', (req, res) => {
  res.json(photos);
});

app.post('/api/clear', (req, res) => {
  photos = [];
  console.log('All photos cleared');
  res.json({ success: true });
});

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Security Guard Control [DEMO]</title>
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
    .demo-badge {
      background: linear-gradient(135deg, #ff9800, #f57c00);
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      text-align: center;
      margin-bottom: 20px;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
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
      animation: fadeIn 0.5s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
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
    .photo-info strong {
      color: #333;
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
    .no-photos small {
      display: block;
      margin-top: 10px;
      font-size: 14px;
      color: #bbb;
    }
    .info-box {
      background: #e3f2fd;
      border-left: 4px solid #2196F3;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      font-size: 14px;
      color: #1976D2;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="demo-badge">
      🎭 DEMO MODE - Simulated without Arduino
    </div>
    
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
      <div class="info-box">
        ℹ️ <strong>Demo Info:</strong> Distance changes randomly. When armed and distance < 15cm, the system will automatically capture a photo and trigger the alarm.
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
    let lastPhotoCount = 0;
    
    function updateStatus() {
      fetch('/api/status')
        .then(r => r.json())
        .then(d => {
          let s = document.getElementById('status');
          
          if (d.doorOpen) {
            s.innerHTML = '<div class="emoji">🚨</div>ALERT - DOOR OPEN!<br><small style="font-size:16px;">📷 Camera LED flashing...</small>';
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
          
          // Check if new photo was taken
          if (d.photoCount > lastPhotoCount) {
            loadPhotos();
            lastPhotoCount = d.photoCount;
          }
        })
        .catch(err => console.error('Error:', err));
    }
    
    function loadPhotos() {
      fetch('/api/photos')
        .then(r => r.json())
        .then(photos => {
          let html = '';
          if (photos.length === 0) {
            html = '<div class="no-photos">📷<br>No photos yet<br><small>Turn on the system and wait for simulated door opening to capture photos</small></div>';
          } else {
            photos.forEach(photo => {
              html += '<div class="photo-item">';
              html += '<img src="' + photo.imageUrl + '" alt="Security photo" loading="lazy">';
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
      if (confirm('Delete all ' + lastPhotoCount + ' photos?')) {
        fetch('/api/clear', {method:'POST'})
          .then(() => {
            lastPhotoCount = 0;
            loadPhotos();
            updateStatus();
          });
      }
    }
    
    setInterval(updateStatus, 500);
    updateStatus();
    loadPhotos();
  </script>
</body>
</html>
  `);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🎭 DEMO Server running (no Arduino needed)!`);
  console.log(`🌐 Open your browser to: http://localhost:${PORT}`);
  console.log(`\n💡 How it works:`);
  console.log(`   - Distance changes randomly every 2 seconds`);
  console.log(`   - When armed + distance < 15cm = photo captured automatically`);
  console.log(`   - Photos use random images from picsum.photos\n`);
});
