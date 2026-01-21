import './RunQueryBtn.scss';

import { Button } from 'antd';
import { Command, Loader2, Play } from 'lucide-react';
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

interface RunQueryBtnProps {
	isLoadingQueries?: boolean;
	handleCancelQuery?: () => void;
	onStageRunQuery?: () => void;
}

function RunQueryBtn({
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
			Run Query
			<div className="kbd-hint">
				{isMac ? <Command size={12} /> : <span>Ctrl</span>}
				<span className="kbd-plus">+</span>
				<span className="kbd-key">Enter</span>
			</div>
		</Button>
	);
}

export default RunQueryBtn;

// should i use cmd instead of icon
// fix size of run query btn
// other style suggestion
