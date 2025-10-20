# Zebra Print Relay Service

A lightweight Node.js service that enables printing ZPL labels to Zebra printers on your local network via TCP port 9100.

## Quick Start

### Option 1: Run with Node.js (Development/Testing)

```bash
cd print-relay-service
npm install
npm start
```

The service will start on `http://localhost:8080`

### Option 2: Run with Docker (Recommended for Production)

```bash
cd print-relay-service
docker-compose up -d
```

Check service status:
```bash
docker-compose ps
docker-compose logs -f
```

Stop service:
```bash
docker-compose down
```

### Option 3: Windows Service (Production on Windows)

1. Install dependencies:
```bash
cd print-relay-service
npm install
npm install -g node-windows
```

2. Install as Windows service:
```bash
node windows-service.js install
```

3. Manage the service:
```bash
# Start service
node windows-service.js start

# Stop service
node windows-service.js stop

# Uninstall service
node windows-service.js uninstall
```

Or use Windows Services Manager (services.msc) to manage "Zebra Print Relay" service.

## Configuration

### Frontend Configuration

Create a `.env` file in your frontend project:

```env
VITE_PRINT_RELAY_URL=http://localhost:8080
```

For production, change to your relay server's address:
```env
VITE_PRINT_RELAY_URL=http://print-relay.local:8080
# or
VITE_PRINT_RELAY_URL=http://192.168.1.50:8080
```

### Service Configuration

Edit `docker-compose.yml` or set environment variable:

```bash
# Change port (default: 8080)
PORT=8080 npm start
```

## API Endpoints

### POST /print-zpl

Send ZPL code to a printer.

**Request:**
```json
{
  "zpl": "^XA^FO50,50^A0N,50,50^FDHello World^FS^XZ",
  "printerIp": "192.168.1.100"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Label sent to printer successfully",
  "bytesWritten": 123
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "zebra-print-relay"
}
```

## Network Requirements

- Service must be on the same network as Zebra printers (or have routing configured)
- Port 9100 must be accessible on printer
- Firewall must allow outbound TCP connections on port 9100
- For Docker: Uses host network mode to access LAN printers

## Troubleshooting

### "Connection timeout" or "Failed to connect to printer"

1. Verify printer IP address:
   - Print network config label from printer
   - Check router admin panel
   - Ping printer IP: `ping 192.168.1.100`

2. Check printer is online and connected to network

3. Verify port 9100 is accessible:
   ```bash
   # Windows
   telnet 192.168.1.100 9100
   
   # Linux/Mac
   nc -zv 192.168.1.100 9100
   ```

4. Check firewall rules allow TCP port 9100

### "Cannot reach print relay service"

1. Verify service is running:
   ```bash
   # Check health endpoint
   curl http://localhost:8080/health
   ```

2. Check service logs:
   ```bash
   # Docker
   docker-compose logs -f
   
   # Node.js
   # Check terminal output
   
   # Windows Service
   # Check Event Viewer > Windows Logs > Application
   ```

3. Verify `VITE_PRINT_RELAY_URL` environment variable in frontend

4. Check CORS settings if accessing from different domain

### Docker Issues

If using Docker on Windows/Mac, you may need to adjust network settings:

1. Try bridge network instead of host:
   ```yaml
   # docker-compose.yml
   network_mode: bridge
   ports:
     - "8080:8080"
   ```

2. Allow Docker to access host network in Docker Desktop settings

## Security Considerations

- Service runs on port 8080 by default (not privileged)
- CORS enabled for all origins (adjust in production)
- Input validation for IP addresses and ZPL content
- 10-second timeout for printer connections
- Runs as non-root user in Docker

### Production Hardening

1. **Restrict CORS origins:**
   ```javascript
   // server.js
   app.use(cors({
     origin: 'https://your-frontend-domain.com'
   }));
   ```

2. **Add authentication:**
   ```javascript
   // Add API key middleware
   app.use((req, res, next) => {
     const apiKey = req.headers['x-api-key'];
     if (apiKey !== process.env.API_KEY) {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     next();
   });
   ```

3. **Rate limiting:**
   ```bash
   npm install express-rate-limit
   ```
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const limiter = rateLimit({
     windowMs: 1 * 60 * 1000, // 1 minute
     max: 60 // 60 requests per minute
   });
   
   app.use('/print-zpl', limiter);
   ```

4. **HTTPS with reverse proxy:**
   Use nginx or Apache as reverse proxy with SSL certificate

## Logs

Service logs include:
- Connection attempts with timestamps
- Bytes sent to printer
- Error messages with details
- Connection lifecycle events

Docker logs are automatically rotated (max 10MB, 3 files).

## Support

Test the service with curl:

```bash
curl -X POST http://localhost:8080/print-zpl \
  -H "Content-Type: application/json" \
  -d '{"zpl":"^XA^FO50,50^A0N,50,50^FDTest Label^FS^XZ","printerIp":"192.168.1.100"}'
```

For issues, check:
1. Service logs for error details
2. Network connectivity to printer
3. Printer status and configuration
4. Firewall and security software settings
