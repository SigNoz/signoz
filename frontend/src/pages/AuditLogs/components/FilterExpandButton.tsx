import { ArrowUpToLine, Filter } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';

import styles from './FilterExpandButton.module.scss';

interface FilterExpandButtonProps {
	onClick: () => void;
}

export function FilterExpandButton({
	onClick,
}: FilterExpandButtonProps): JSX.Element {
	return (
		<Tooltip title="Show Filters">
			<Button
				variant="outlined"
				size="md"
				aria-label="Show filters"
				color="secondary"
				onClick={onClick}
				testId="audit-logs-expand-filters-btn"
			>
				<Filter size={12} />
				<ArrowUpToLine size={12} className={styles.expandIcon} />
			</Button>
		</Tooltip>
	);
}
