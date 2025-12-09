import './GraphControlsPanel.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import { Binoculars, DraftingCompass, ScrollText } from 'lucide-react';

interface GraphControlsPanelProps {
	id: string;
	onViewLogsClick?: (event: React.MouseEvent) => void;
	onViewTracesClick: (event: React.MouseEvent) => void;
	onViewAPIMonitoringClick?: (event: React.MouseEvent) => void;
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
				type="link"
				icon={<DraftingCompass size={14} />}
				size="small"
				onClick={(event: React.MouseEvent): void => onViewTracesClick(event)}
				style={{ color: Color.BG_VANILLA_100 }}
			>
				View traces
			</Button>
			{onViewLogsClick && (
				<Button
					type="link"
					icon={<ScrollText size={14} />}
					size="small"
					onClick={(event: React.MouseEvent): void => onViewLogsClick(event)}
					style={{ color: Color.BG_VANILLA_100 }}
				>
					View logs
				</Button>
			)}
			{onViewAPIMonitoringClick && (
				<Button
					type="link"
					icon={<Binoculars size={14} />}
					size="small"
					onClick={(event: React.MouseEvent): void =>
						onViewAPIMonitoringClick(event)
					}
					style={{ color: Color.BG_VANILLA_100 }}
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
