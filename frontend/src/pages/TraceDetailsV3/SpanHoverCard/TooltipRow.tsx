import { Typography } from '@signozhq/ui/typography';

import styles from './SpanHoverCard.module.scss';

interface TooltipRowProps {
	label: string;
	value: string;
	isTotal?: boolean;
	testId?: string;
}

function TooltipRow({
	label,
	value,
	isTotal,
	testId,
}: TooltipRowProps): JSX.Element {
	return (
		<div className={styles.row} data-testid={testId}>
			<Typography.Text
				size="small"
				color={isTotal ? undefined : 'muted'}
				truncate={1}
			>
				{label}
			</Typography.Text>
			<Typography.Text size="small" truncate={1} className={styles.rowValue}>
				{value}
			</Typography.Text>
		</div>
	);
}

export default TooltipRow;
