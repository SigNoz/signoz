import { ReactNode } from 'react';
import { Button } from '@signozhq/ui/button';
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
	label?: string;
	disabled?: boolean;
	disabledTooltip?: ReactNode;
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
	label,
	isLoadingQueries,
	handleCancelQuery,
	onStageRunQuery,
	disabled,
	disabledTooltip,
}: RunQueryBtnProps): JSX.Element {
	const isMac = getUserOperatingSystem() === UserOperatingSystem.MACOS;
	const isLoading = isLoadingQueries ?? false;

	return isLoading ? (
		<Button
			size="md"
			variant="solid"
			color="danger"
			type="button"
			data-run-query-btn
			prefix={<LoaderCircle size={14} className="loading-icon animate-spin" />}
			onClick={handleCancelQuery}
		>
			Cancel
		</Button>
	) : (
		<Button
			size="md"
			variant="solid"
			color="primary"
			type="button"
			data-run-query-btn
			disabled={disabled}
			disabledTooltip={disabledTooltip}
			onClick={onStageRunQuery}
			prefix={<Play size={14} />}
			suffix={
				<div className="cmd-hint">
					{isMac ? (
						<Command size={12} data-testid="cmd-hint-modifier-mac" />
					) : (
						<ChevronUp size={12} data-testid="cmd-hint-modifier-non-mac" />
					)}
					<CornerDownLeft size={12} data-testid="cmd-hint-enter" />
				</div>
			}
		>
			{label || 'Run Query'}
		</Button>
	);
}

export default RunQueryBtn;
