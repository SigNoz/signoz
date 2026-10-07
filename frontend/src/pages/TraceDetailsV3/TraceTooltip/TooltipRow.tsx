import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import styles from './TraceTooltip.module.scss';

interface TooltipRowProps {
	label: string;
	value?: string;
	isTotal?: boolean;
	isNested?: boolean;
	testId?: string;
}

function TooltipRow({
	label,
	value,
	isTotal,
	isNested,
	testId,
}: TooltipRowProps): JSX.Element {
	return (
		<div
			className={cx(styles.row, isNested && styles.nestedRow)}
			data-testid={testId}
		>
			<Typography.Text
				size="small"
				color={isTotal ? undefined : 'muted'}
				truncate={1}
			>
				{label}
			</Typography.Text>
			{value !== undefined && (
				<Typography.Text size="small" truncate={1} className={styles.rowValue}>
					{value}
				</Typography.Text>
			)}
		</div>
	);
}

export default TooltipRow;
