import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Projection from './components/Projection.jsx';
import './styles.css';

// A mesma página serve as duas janelas: o hash decide qual interface mostrar
const isProjection = window.location.hash === '#projection';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>{isProjection ? <Projection /> : <App />}</React.StrictMode>
);
