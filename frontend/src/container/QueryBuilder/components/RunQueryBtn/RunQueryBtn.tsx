import { Button } from '@signozhq/ui/button';
import cx from 'classnames';
import {
	ChevronUp,
	Command,
	CornerDownLeft,
	LoaderCircle,
	Play,
} from '@signozhq/icons';
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
			color="destructive"
			type="button"
			prefix={<LoaderCircle size={14} className="loading-icon animate-spin" />}
			className={cx('cancel-query-btn', className)}
			onClick={handleCancelQuery}
		>
			Cancel
		</Button>
	) : (
		<Button
			color="primary"
			type="button"
			className={cx('run-query-btn', className)}
			disabled={disabled}
			onClick={onStageRunQuery}
			prefix={<Play size={14} />}
		>
			{label || 'Run Query'}
			<div className="cmd-hint">
				{isMac ? (
					<Command size={12} data-testid="cmd-hint-modifier-mac" />
				) : (
					<ChevronUp size={12} data-testid="cmd-hint-modifier-non-mac" />
				)}
				<CornerDownLeft size={12} data-testid="cmd-hint-enter" />
			</div>
		</Button>
	);
}

export default RunQueryBtn;
