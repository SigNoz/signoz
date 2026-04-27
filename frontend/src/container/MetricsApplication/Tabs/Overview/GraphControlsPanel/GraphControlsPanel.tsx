// File: frontend/src/container/MetricsApplication/Tabs/Overview/GraphControlsPanel/GraphControlsPanel.tsx
import React from 'react';
import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import { Binoculars, DraftingCompass, ScrollText } from 'lucide-react';

import './GraphControlsPanel.styles.scss';

interface GraphControlsPanelProps {
  id: string;
  onViewLogsClick?: (e: React.MouseEvent) => void;
  onViewTracesClick?: (e: React.MouseEvent) => void;
  onViewAPIMonitoringClick?: (e: React.MouseEvent) => void;
}

const GraphControlsPanel = ({
  id,
  onViewTracesClick,
  onViewLogsClick,
  onViewAPIMonitoringClick,
}: GraphControlsPanelProps): JSX.Element => {
  return (
    <div id={id} className="graph-controls-panel">
      {onViewTracesClick && (
        <Button
          type="link"
          icon={<DraftingCompass size={14} />}
          size="small"
          onClick={onViewTracesClick}
          data-testid="view-traces-button"
          className="graph-controls-panel__button"
        >
          View traces
        </Button>
      )}
      {onViewLogsClick && (
        <Button
          type="link"
          icon={<ScrollText size={14} />}
          size="small"
          onClick={onViewLogsClick}
          data-testid="view-logs-button"
          className="graph-controls-panel__button"
        >
          View logs
        </Button>
      )}
      {onViewAPIMonitoringClick && (
        <Button
          type="link"
          icon={<Binoculars size={14} />}
          size="small"
          onClick={onViewAPIMonitoringClick}
          data-testid="view-api-monitoring-button"
          className="graph-controls-panel__button"
        >
          View API monitoring
        </Button>
      )}
    </div>
  );
};

export default GraphControlsPanel;
```