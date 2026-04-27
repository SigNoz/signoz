// File: frontend/src/container/MetricsApplication/Tabs/Overview/GraphControlsPanel/GraphControlsPanel.tsx
import React from 'react';
import { Button } from 'antd';
import { Binoculars, DraftingCompass, ScrollText } from 'lucide-react';

import './GraphControlsPanel.styles.scss';

interface GraphControlsPanelProps {
  id: string;
  onViewLogsClick?: (e: React.MouseEvent) => void;
  onViewTracesClick?: (e: React.MouseEvent) => void;
  onViewMetricsClick?: (e: React.MouseEvent) => void;
}

const GraphControlsPanel: React.FC<GraphControlsPanelProps> = ({
  id,
  onViewLogsClick,
  onViewTracesClick,
  onViewMetricsClick,
}) => {
  const handleViewLogsClick = (e: React.MouseEvent) => {
    if (onViewLogsClick) {
      onViewLogsClick(e);
    }
  };

  const handleViewTracesClick = (e: React.MouseEvent) => {
    if (onViewTracesClick) {
      onViewTracesClick(e);
    }
  };

  const handleViewMetricsClick = (e: React.MouseEvent) => {
    if (onViewMetricsClick) {
      onViewMetricsClick(e);
    }
  };

  return (
    <div className="graph-controls-panel" data-testid={`graph-controls-panel-${id}`}>
      <Button
        type="text"
        icon={<Binoculars size={16} />}
        onClick={handleViewLogsClick}
        data-testid={`view-logs-btn-${id}`}
      >
        Logs
      </Button>
      <Button
        type="text"
        icon={<DraftingCompass size={16} />}
        onClick={handleViewTracesClick}
        data-testid={`view-traces-btn-${id}`}
      >
        Traces
      </Button>
      <Button
        type="text"
        icon={<ScrollText size={16} />}
        onClick={handleViewMetricsClick}
        data-testid={`view-metrics-btn-${id}`}
      >
        Metrics
      </Button>
    </div>
  );
};

export default GraphControlsPanel;