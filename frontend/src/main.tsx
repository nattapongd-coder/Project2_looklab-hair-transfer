import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Filter out benign TensorFlow Lite / MediaPipe WebAssembly C++ info messages routed to stderr/console.error
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const first = args[0];
  if (
    typeof first === 'string' &&
    (first.includes('TensorFlow Lite') ||
      first.includes('XNNPACK') ||
      first.includes('delegate for CPU') ||
      first.startsWith('INFO:'))
  ) {
    console.info(...args);
    return;
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
