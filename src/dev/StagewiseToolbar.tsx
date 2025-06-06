import { createRoot } from 'react-dom/client';
import { StagewiseToolbar } from '@stagewise/toolbar-react';

const stagewiseConfig = {
    plugins: []
};

export function initStagewise() {
    const container = document.createElement('div');
    container.id = 'stagewise-toolbar-root';
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(<StagewiseToolbar config={stagewiseConfig} />);
} 