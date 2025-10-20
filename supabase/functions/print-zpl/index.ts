// Edge function to print ZPL to a Zebra printer over TCP port 9100
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate IPv4 address format
function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipv4Regex.test(ip);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received print request');
    
    // Parse request body
    const { zpl, printerIp } = await req.json();

    // Validate inputs
    if (!zpl || typeof zpl !== 'string' || zpl.trim().length === 0) {
      console.error('Invalid ZPL: empty or not a string');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'ZPL code is required and must be a non-empty string' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!printerIp || typeof printerIp !== 'string' || !isValidIPv4(printerIp)) {
      console.error('Invalid printer IP:', printerIp);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Valid IPv4 address is required for printerIp' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Connecting to printer at ${printerIp}:9100`);

    // Open TCP connection to printer
    let conn: Deno.TcpConn;
    try {
      conn = await Deno.connect({
        hostname: printerIp,
        port: 9100,
        transport: 'tcp',
      });
      console.log('TCP connection established');
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to connect to printer at ${printerIp}:9100. Ensure the printer is online and reachable on the network.`,
          details: errorMessage
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    try {
      // Convert ZPL string to bytes
      const encoder = new TextEncoder();
      const zplBytes = encoder.encode(zpl);
      
      console.log(`Sending ${zplBytes.length} bytes to printer`);
      
      // Send ZPL data to printer
      const bytesWritten = await conn.write(zplBytes);
      console.log(`Successfully sent ${bytesWritten} bytes`);

      // Close connection
      conn.close();
      console.log('Connection closed');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Label sent to printer successfully',
          bytesWritten
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      console.error('Error sending data to printer:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      try {
        conn.close();
      } catch {}
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send data to printer',
          details: errorMessage
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Unexpected error in print-zpl function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
    );
  }
});
