import { ChevronDown, ChevronUp } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';

import styles from './LogNavigation.module.scss';

interface LogNavigationProps {
	onNavigatePrev: () => void;
	onNavigateNext: () => void;
	isPrevDisabled: boolean;
	isNextDisabled: boolean;
}

function LogNavigation({
	onNavigatePrev,
	onNavigateNext,
	isPrevDisabled,
	isNextDisabled,
}: LogNavigationProps): JSX.Element {
	return (
		<div className={styles.arrows}>
			<Tooltip
				title={isPrevDisabled ? undefined : 'Move to previous log'}
				side="top"
			>
				<Button
					disabledTooltip="No previous log"
					size="sm"
					variant="outlined"
					color="secondary"
					icon
					aria-label="Move to previous log"
					disabled={isPrevDisabled}
					onClick={onNavigatePrev}
					testId="log-details-header-prev"
				>
					<ChevronUp size={14} />
				</Button>
			</Tooltip>
			<Tooltip title={isNextDisabled ? undefined : 'Move to next log'} side="top">
				<Button
					disabledTooltip="No next log"
					size="sm"
					variant="outlined"
					color="secondary"
					icon
					aria-label="Move to next log"
					disabled={isNextDisabled}
					onClick={onNavigateNext}
					testId="log-details-header-next"
				>
					<ChevronDown size={14} />
				</Button>
			</Tooltip>
		</div>
	);
}

export default LogNavigation;
