import React from 'react';
import { Color } from '@signozhq/design-tokens';
import { Binoculars, DraftingCompass, ScrollText } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import './GraphControlsPanel.styles.scss';

interface GraphControlsPanelProps {
	id: string;
	onViewLogsClick?: (e: React.MouseEvent) => void;
	onViewTracesClick: (e: React.MouseEvent) => void;
	onViewAPIMonitoringClick?: (e: React.MouseEvent) => void;
}

function GraphControlsPanel({
	id,
	onViewLogsClick,
	onViewTracesClick,
	onViewAPIMonitoringClick,
}: GraphControlsPanelProps): JSX.Element {
	return (
		<div id={id} className="graph-controls-panel">
			<Button
				onClick={onViewTracesClick}
				style={{ color: Color.BG_VANILLA_100 }}
				size="sm"
				variant="link"
				prefix={<DraftingCompass size={14} />}
			>
				View traces
			</Button>
			{onViewLogsClick && (
				<Button
					onClick={onViewLogsClick}
					style={{ color: Color.BG_VANILLA_100 }}
					size="sm"
					variant="link"
					prefix={<ScrollText size={14} />}
				>
					View logs
				</Button>
			)}
			{onViewAPIMonitoringClick && (
				<Button
					onClick={onViewAPIMonitoringClick}
					style={{ color: Color.BG_VANILLA_100 }}
					size="sm"
					variant="link"
					prefix={<Binoculars size={14} />}
				>
					View External APIs
				</Button>
			)}
		</div>
	);
}

GraphControlsPanel.defaultProps = {
	onViewLogsClick: undefined,
	onViewAPIMonitoringClick: undefined,
};

export default GraphControlsPanel;
