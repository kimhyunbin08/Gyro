export {};

process.env.GYRO_API_HOST ??= '127.0.0.1';
await import('./server.js');
