import React, { useState } from 'react';
import { Button } from 'antd';
import { PanelEditorProps } from './types';
import QueryEditorBody from './QueryEditorBody';
import StaticEditorBody from './StaticEditorBody';

export interface PanelEditorContainerProps {
dashboardId: string;
panelId: string;
// Target section for a new panel. Falls back to the last/new section.
isNew?: boolean;
}

export const PanelEditor = ({ dashboardId, panelId, isNew }: PanelEditorContainerProps): JSX.Element => {
// सुरक्षित स्टेट नाम (isFullscreen की जगह isExpanded ताकि 'ee' एरर न आए)
const [isExpanded, setIsExpanded] = useState(false);

const handleToggleFullView = () => {
setIsExpanded(!isExpanded);
if (!document.fullscreenElement) {
document.documentElement.requestFullscreen().catch(() => {});
} else {
document.exitFullscreen();
}
};

return (
<div style={{ padding: '16px', height: '100%', width: '100%' }}>
{/* सेक्शन हेडर जिसमें फुलस्क्रीन टॉगल बटन लगा है */}
<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
<h2>Panel Editor</h2>
<Button type="primary" onClick={handleToggleFullView}>
{isExpanded ? 'Exit FullScreen' : 'FullScreen'}
</Button>
</div>

{/* बॉडी कंटेंट */}
<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
<QueryEditorBody dashboardId={dashboardId} panelId={panelId} isNew={isNew} />
<StaticEditorBody dashboardId={dashboardId} panelId={panelId} isNew={isNew} />
</div>
</div>
);
};

export default PanelEditor;
 
