import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App'; // Removed .tsx extension
import './index.css';

createRoot(document.getElementById('root')!).render(
  // <StrictMode> // Закомментировано: убрано для теста max depth error в ReactQuill. Верните для dev после теста.
    <App />
  // </StrictMode>
);


