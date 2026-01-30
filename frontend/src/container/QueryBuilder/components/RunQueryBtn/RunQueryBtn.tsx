import { Button } from 'antd';
import {
	ChevronUp,
	Command,
	CornerDownLeft,
	Loader2,
	Play,
} from 'lucide-react';
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

import './RunQueryBtn.scss';

interface RunQueryBtnProps {
	label?: string;
	isLoadingQueries?: boolean;
	handleCancelQuery?: () => void;
	onStageRunQuery?: () => void;
}

function RunQueryBtn({
	label,
	isLoadingQueries,
	handleCancelQuery,
	onStageRunQuery,
}: RunQueryBtnProps): JSX.Element {
	const isMac = getUserOperatingSystem() === UserOperatingSystem.MACOS;
	return isLoadingQueries ? (
		<Button
			type="default"
			icon={<Loader2 size={14} className="loading-icon animate-spin" />}
			className="cancel-query-btn periscope-btn danger"
			onClick={handleCancelQuery}
		>
			Cancel
		</Button>
	) : (
		<Button
			type="primary"
			className="run-query-btn periscope-btn primary"
			disabled={isLoadingQueries || !onStageRunQuery}
			onClick={onStageRunQuery}
			icon={<Play size={14} />}
		>
			{label || 'Run Query'}
			<div className="cmd-hint">
				{isMac ? <Command size={12} /> : <ChevronUp size={12} />}
				<CornerDownLeft size={12} />
			</div>
		</Button>
	);
}

export default RunQueryBtn;
