const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// CHANGE THIS to your Arduino's port from step 2
const ARDUINO_PORT = '/dev/tty.usbmodem14201'; // <-- UPDATE THIS!

const port = new SerialPort({
  path: ARDUINO_PORT,
  baudRate: 9600
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

let latestStatus = {
  systemOn: false,
  distance: 0,
  doorOpen: false
};

parser.on('data', (data) => {
  try {
    const json = JSON.parse(data);
    latestStatus = json;
    console.log('Status update:', json);
  } catch (e) {
    console.log('Arduino:', data);
  }
});

app.get('/api/status', (req, res) => {
  res.json(latestStatus);
});

app.post('/api/turnon', (req, res) => {
  port.write('ON\n');
  res.json({ success: true });
});

app.post('/api/turnoff', (req, res) => {
  port.write('OFF\n');
  res.json({ success: true });
});

app.post('/api/toggle', (req, res) => {
  port.write('TOGGLE\n');
  res.json({ success: true });
});

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
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 500px;
      width: 100%;
    }
    h1 { 
      text-align: center; 
      color: #333; 
      margin-bottom: 30px;
      font-size: 28px;
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
    button:active {
      transform: translateY(0);
    }
    .on { background: linear-gradient(135deg, #4CAF50, #45a049); }
    .off { background: linear-gradient(135deg, #f44336, #da190b); }
    
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
  </style>
</head>
<body>
  <div class="container">
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
    </div>
  </div>
  <script>
    function updateStatus() {
      fetch('/api/status')
        .then(r => r.json())
        .then(d => {
          let s = document.getElementById('status');
          
          if (d.doorOpen) {
            s.innerHTML = '<div class="emoji">🚨</div>ALERT - DOOR OPEN!';
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
            '<p>🚪 Door: ' + (d.doorOpen ? 'OPEN' : 'CLOSED') + '</p>';
        })
        .catch(err => {
          console.error('Error:', err);
        });
    }
    
    function turnOn() { 
      fetch('/api/turnon', {method:'POST'})
        .then(() => setTimeout(updateStatus, 100)); 
    }
    
    function turnOff() { 
      fetch('/api/turnoff', {method:'POST'})
        .then(() => setTimeout(updateStatus, 100)); 
    }
    
    setInterval(updateStatus, 500);
    updateStatus();
  </script>
</body>
</html>
  `);
});

const PORT = 4000; 
app.listen(PORT, () => {
  console.log(`\n✅ Server running!`);
  console.log(`🌐 Open your browser to: http://localhost:${PORT}`);
  console.log(`🔌 Connected to Arduino on ${ARDUINO_PORT}\n`);
});
