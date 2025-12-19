import React from 'react';
import { createRoot } from 'react-dom/client';
import AISummary from './AISummary';

// Find all containers for AI summary and render React component
document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('.ai-summary-react-container');

  containers.forEach((container) => {
    const root = createRoot(container);
    root.render(<AISummary />);
  });
});
