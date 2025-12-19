// Worker process for background job processing
import './backend/queue/worker.js';

console.log('🚀 Background worker process started');
console.log('📝 Listening for product processing jobs...');
console.log('📊 Press Ctrl+C to stop the worker');

// Keep the process running
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
