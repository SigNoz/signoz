import { Button } from 'antd';
import cx from 'classnames';
import {
	ChevronUp,
	Command,
	CornerDownLeft,
	Loader2,
	Play,
} from 'lucide-react';
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

import './RunQueryBtn.scss';

type RunQueryBtnProps = {
	className?: string;
	label?: string;
	disabled?: boolean;
} & (
	| {
			onStageRunQuery: () => void;
			handleCancelQuery: () => void;
			isLoadingQueries: boolean;
	  }
	| {
			onStageRunQuery?: never;
			handleCancelQuery?: never;
			isLoadingQueries?: never;
	  }
);

function RunQueryBtn({
	className,
	label,
	isLoadingQueries,
	handleCancelQuery,
	onStageRunQuery,
	disabled,
}: RunQueryBtnProps): JSX.Element {
	const isMac = getUserOperatingSystem() === UserOperatingSystem.MACOS;
	const isLoading = isLoadingQueries ?? false;

	return isLoading ? (
		<Button
			type="default"
			icon={<Loader2 size={14} className="loading-icon animate-spin" />}
			className={cx('cancel-query-btn periscope-btn danger', className)}
			onClick={handleCancelQuery}
		>
			Cancel
		</Button>
	) : (
		<Button
			type="primary"
			className={cx('run-query-btn periscope-btn primary', className)}
			disabled={disabled}
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
