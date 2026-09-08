import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';

window.__ORT_BOOT_DEBUG__({ type: 'main-module-loaded' });

const rootElement = document.getElementById('root');
window.__ORT_BOOT_DEBUG__({
  type: 'react-root-found',
  exists: Boolean(rootElement),
});

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

window.__ORT_BOOT_DEBUG__({ type: 'react-render-dispatched' });