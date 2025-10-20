# Network Printing Setup Guide

This guide explains how to set up network printing to your Zebra label printer using the TCP port 9100 backend API.

## Overview

The network printing feature allows you to print labels directly to a Zebra printer on your local network without requiring any local software installations on the client side. It uses:

- **Backend**: Supabase Edge Function that opens a TCP socket to port 9100
- **Frontend**: React dialog component with printer IP configuration
- **Protocol**: Raw ZPL code sent over TCP

## Setup Instructions

### 1. Deploy the Edge Function

The edge function is located in `supabase/functions/print-zpl/index.ts`. To deploy it:

#### Option A: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (you'll be prompted to select your project)
supabase link

# Deploy the edge function
supabase functions deploy print-zpl
```

#### Option B: Using Lovable Cloud

If you're using Lovable Cloud, the edge function will be automatically deployed when you build your project. Simply enable Lovable Cloud in your project settings.

### 2. Configure Environment Variables

Create a `.env` file in the root of your project (copy from `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
```

Replace `your-project-id` with your actual Supabase project ID.

### 3. Printer Setup

Ensure your Zebra printer is:

1. **Connected to the network**: The printer should have a valid IP address on your local network
2. **Port 9100 accessible**: The printer must accept raw ZPL over TCP port 9100 (this is standard for Zebra printers)
3. **ZPL compatible**: The printer must support ZPL (Zebra Programming Language)

#### Finding Your Printer's IP Address

- **Method 1**: Print a network configuration label from the printer
  - Most Zebra printers have a button combination to print a configuration report
  - The IP address will be displayed on this report

- **Method 2**: Check your router's admin panel
  - Look for connected devices
  - Find your Zebra printer in the list

- **Method 3**: Check the printer's display panel (if available)
  - Navigate to Settings → Network → IP Address

## Usage

1. Click the **Print** button in the label designer
2. A dialog will appear asking for the printer IP address
3. Enter your printer's IP address (e.g., `192.168.1.100`)
4. Optionally check "Remember this IP address" to save it for future prints
5. Click **Print**

The label will be sent directly to your printer via the backend API.

## API Endpoint

### POST /functions/v1/print-zpl

**Request Body:**
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

**Error Response (400/500/503):**
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

## Validation

The API validates:

- **ZPL code**: Must be a non-empty string
- **Printer IP**: Must be a valid IPv4 address format (e.g., 192.168.1.100)

## Security Considerations

- The edge function is configured as public (`verify_jwt = false`) for easier setup
- If you need authentication, remove this setting from `supabase/config.toml`
- Consider implementing IP whitelisting or rate limiting for production use
- Input validation is performed on both client and server side

## Troubleshooting

### "Failed to connect to printer"

- Verify the printer IP address is correct
- Ensure the printer is powered on and connected to the network
- Check that your server can reach the printer's network (firewall rules)
- Ping the printer IP from your server to verify connectivity

### "Supabase configuration not found"

- Make sure you've created a `.env` file with `VITE_SUPABASE_URL`
- Restart your development server after creating/modifying `.env`
- Verify the Supabase URL is correct

### "Failed to send data to printer"

- The printer might be offline or busy
- Check printer status and error lights
- Try printing a test label directly from the printer
- Verify the printer supports ZPL over TCP port 9100

## Network Requirements

- Printer and server must be on the same network (or have routing configured)
- Port 9100 must be accessible (not blocked by firewalls)
- Printer must support raw TCP printing (standard for Zebra printers)

## Additional Features

- **IP Address Memory**: The app remembers your printer IP in browser localStorage
- **Input Validation**: IPv4 address format is validated before sending
- **Error Handling**: Descriptive error messages for troubleshooting
- **Connection Timeout**: Prevents hanging requests to unreachable printers

## Support

For issues or questions:
1. Check the browser console for detailed error messages
2. Review the edge function logs in your Supabase dashboard
3. Verify network connectivity and printer status
