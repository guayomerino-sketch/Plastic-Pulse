import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import { GameProvider } from './src/game/store';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </React.StrictMode>
);
