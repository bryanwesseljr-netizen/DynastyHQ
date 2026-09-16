import { createRoot } from 'react-dom/client';
import PreviewReseedControl from './PreviewReseedControl.jsx';

export const mountPreviewReseedControl = (container) => {
  if (!container) return null;
  const root = createRoot(container);
  root.render(<PreviewReseedControl />);
  return root;
};
