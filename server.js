import app from './app.js';
import mongoose from 'mongoose';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.name, err.message);
  console.log('Shutting down...');
  process.exit(1);
});

const MONGODB_DB = process.env.MONGODB_URI.replace('<PASSWORD>', process.env.MONGODB_PASSWORD);

mongoose
  .connect(MONGODB_DB)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.name, err.message);
  console.log('Shutting down...');
  server.close(() => { // Shutdown server gracefully before exiting the process
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated!');
  });
});