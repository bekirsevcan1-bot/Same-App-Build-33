import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

window.addEventListener('error', (e) => {
  document.body.innerHTML = `<div style="padding:20px;color:red;font-family:sans-serif;"><h2>Runtime Error:</h2><pre>${e.message}\n${e.filename}:${e.lineno}</pre></div>`;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
