// Windows Service wrapper using node-windows
// Install: npm install -g node-windows
// Then run: node windows-service.js install

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'Zebra Print Relay',
  description: 'TCP relay service for printing ZPL to Zebra printers',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: [],
  env: [
    {
      name: "PORT",
      value: "8080"
    }
  ]
});

// Listen for the "install" event
svc.on('install', () => {
  console.log('Service installed successfully!');
  console.log('Starting service...');
  svc.start();
});

// Listen for the "start" event
svc.on('start', () => {
  console.log('Service started!');
  console.log('Print relay is now running on port 8080');
});

// Listen for the "uninstall" event
svc.on('uninstall', () => {
  console.log('Service uninstalled successfully!');
});

// Check command line arguments
const command = process.argv[2];

if (command === 'install') {
  svc.install();
} else if (command === 'uninstall') {
  svc.uninstall();
} else if (command === 'start') {
  svc.start();
} else if (command === 'stop') {
  svc.stop();
} else {
  console.log('Usage:');
  console.log('  node windows-service.js install   - Install and start the service');
  console.log('  node windows-service.js uninstall - Uninstall the service');
  console.log('  node windows-service.js start     - Start the service');
  console.log('  node windows-service.js stop      - Stop the service');
}
