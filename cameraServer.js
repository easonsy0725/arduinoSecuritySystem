const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// === CONFIGURATION ===
// Change this to your Arduino port
const ARDUINO_PORT = '/dev/tty.usbmodem101';

const port = new SerialPort({
  path: ARDUINO_PORT,
  baudRate: 9600,
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// === STATE ===
let latestStatus = {
  systemOn: false,
  distance: 0,
  doorOpen: false,
  photoCount: 0,
  doorOpen_prev: false,
};

let photos = [];

// === SERIAL HANDLING ===
parser.on('data', (data) => {
  try {
    const json = JSON.parse(data);
    const prevDoor = latestStatus.doorOpen;

    latestStatus = { ...latestStatus, ...json };

    // Door just went from closed -> open
    if (json.doorOpen && !prevDoor) {
      captureSimulatedPhoto();
    }
  } catch (e) {
    console.log('Arduino:', data);
  }
});

// Always-a-person "photo"
function captureSimulatedPhoto() {
  const now = new Date();

  const index = Math.floor(Math.random() * 99);
  const gender = Math.random() > 0.5 ? 'men' : 'women';
  const imageUrl = `https://randomuser.me/api/portraits/${gender}/${index}.jpg`;

  const newPhoto = {
    id: Date.now(),
    date: now.toLocaleDateString('en-CA'),
    time: now.toLocaleTimeString('en-GB'),
    imageUrl,
  };

  photos.unshift(newPhoto);
  latestStatus.photoCount = photos.length;
  console.log('📸 Photo captured:', newPhoto.date, newPhoto.time, imageUrl);
}

// === API ROUTES ===

// Status
app.get('/api/status', (req, res) => {
  res.json({
    systemOn: latestStatus.systemOn,
    distance: latestStatus.distance,
    doorOpen: latestStatus.doorOpen,
    photoCount: photos.length,
  });
});

// All photos
app.get('/api/photos', (req, res) => {
  res.json(photos);
});

// Turn ON
app.post('/api/turnon', (req, res) => {
  port.write('ON\n');
  res.json({ success: true });
});

// Turn OFF
app.post('/api/turnoff', (req, res) => {
  port.write('OFF\n');
  res.json({ success: true });
});

// Clear ALL photos
app.post('/api/clear', (req, res) => {
  photos = [];
  latestStatus.photoCount = 0;
  res.json({ success: true });
});

// Delete ONE photo by ID
app.delete('/api/photos/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = photos.length;
  photos = photos.filter((p) => p.id !== id);
  latestStatus.photoCount = photos.length;
  const removed = photos.length < before;
  res.json({ success: removed });
});

// Send Morse message
app.post('/api/message', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ success: false, error: 'Text is required' });
  }
  console.log('Sending Morse message:', text);
  port.write(`MSG:${text}\n`);
  res.json({ success: true });
});

// === START SERVER ===
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`\n✅ Security Server running on http://localhost:${PORT}`);
  console.log(`🔌 Using Arduino port: ${ARDUINO_PORT}`);
});
