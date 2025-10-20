const express = require('express');
const net = require('net');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all origins (adjust in production if needed)
app.use(cors());
app.use(express.json());

// Validate IPv4 address format
function isValidIPv4(ip) {
  const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'zebra-print-relay' });
});

// Print endpoint
app.post('/print-zpl', (req, res) => {
  const { zpl, printerIp } = req.body;

  // Validate inputs
  if (!zpl || typeof zpl !== 'string' || zpl.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'ZPL code is required and must be a non-empty string'
    });
  }

  if (!printerIp || typeof printerIp !== 'string' || !isValidIPv4(printerIp)) {
    return res.status(400).json({
      success: false,
      error: 'Valid IPv4 address is required for printerIp'
    });
  }

  console.log(`[${new Date().toISOString()}] Print request received for ${printerIp}`);

  // Create TCP connection to printer
  const client = new net.Socket();
  const PRINTER_PORT = 9100;
  const TIMEOUT = 10000; // 10 second timeout

  client.setTimeout(TIMEOUT);

  client.connect(PRINTER_PORT, printerIp, () => {
    console.log(`Connected to printer at ${printerIp}:${PRINTER_PORT}`);
    
    // Send ZPL data
    client.write(zpl, (err) => {
      if (err) {
        console.error('Error writing to printer:', err);
        client.destroy();
        return res.status(500).json({
          success: false,
          error: 'Failed to send data to printer',
          details: err.message
        });
      }

      console.log(`Sent ${zpl.length} bytes to printer`);
      
      // Close connection after a short delay to ensure data is sent
      setTimeout(() => {
        client.end();
      }, 100);
    });
  });

  client.on('end', () => {
    console.log('Connection to printer closed');
    res.json({
      success: true,
      message: 'Label sent to printer successfully',
      bytesWritten: zpl.length
    });
  });

  client.on('timeout', () => {
    console.error('Connection timeout');
    client.destroy();
    res.status(503).json({
      success: false,
      error: `Connection timeout. Could not reach printer at ${printerIp}:${PRINTER_PORT}`,
      details: 'Ensure the printer is online and reachable on the network'
    });
  });

  client.on('error', (err) => {
    console.error('Socket error:', err);
    client.destroy();
    res.status(503).json({
      success: false,
      error: `Failed to connect to printer at ${printerIp}:${PRINTER_PORT}`,
      details: err.message
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Zebra Print Relay Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
