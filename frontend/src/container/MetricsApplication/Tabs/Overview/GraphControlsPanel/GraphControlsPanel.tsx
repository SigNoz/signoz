// File: frontend/src/container/MetricsApplication/Tabs/Overview/GraphControlsPanel/GraphControlsPanel.tsx
import React from 'react';
import { Button } from 'antd';
import { Binoculars, DraftingCompass, ScrollText } from 'lucide-react';

import './GraphControlsPanel.styles.scss';

interface GraphControlsPanelProps {
  id: string;
  onViewLogsClick?: (e: React.MouseEvent) => void;
  onViewTracesClick?: (e: React.MouseEvent) =>