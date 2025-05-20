import './GraphControlsPanel.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button } from 'antd';
import { Binoculars, DraftingCompass, ScrollText } from 'lucide-react';

interface GraphControlsPanelProps {
	id: string;
	onViewLogsClick?: () => void;
	onViewTracesClick: () => void;
	onViewAPIMonitoringClick?: () => void;
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
				onClick={onViewTracesClick}
				style={{ color: Color.BG_VANILLA_100 }}
			>
				View traces
			</Button>
			{onViewLogsClick && (
				<Button
					type="link"
					icon={<ScrollText size={14} />}
					size="small"
					onClick={onViewLogsClick}
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
					onClick={onViewAPIMonitoringClick}
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
