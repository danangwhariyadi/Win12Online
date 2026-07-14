import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// BIOS settings API endpoints
app.get('/api/bios-config', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'bios_setup.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      // If error (e.g. doesn't exist), return some defaults
      return res.json({
        cpuHyperThreading: "Enabled",
        cpuTurboBoost: "Enabled",
        cpuCoreRatio: "Auto",
        memoryFrequency: "Auto",
        memoryTimingMode: "Auto",
        xmpProfile: "Disabled",
        tpmState: "Enabled",
        secureBoot: "Enabled",
        fastBoot: "Enabled",
        bootMode: "UEFI",
        bootPriority: "Hard Drive"
      });
    }
    try {
      res.json(JSON.parse(data));
    } catch (parseErr) {
      res.status(500).json({ error: "Invalid JSON format" });
    }
  });
});

app.post('/api/bios-config', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'bios_setup.json');
  const dataStr = JSON.stringify(req.body, null, 2);
  fs.writeFile(filePath, dataStr, 'utf8', (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to write bios setup file" });
    }
    res.json({ success: true });
  });
});

// Catch-all route to serve index.html if requested
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
