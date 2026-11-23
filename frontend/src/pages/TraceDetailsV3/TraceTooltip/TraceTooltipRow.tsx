import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import styles from './TraceTooltip.module.scss';

interface TraceTooltipRowProps {
	label: string;
	value?: string;
	isNested?: boolean;
	isHeading?: boolean;
	testId?: string;
}

function TraceTooltipRow({
	label,
	value,
	isNested,
	isHeading,
	testId,
}: TraceTooltipRowProps): JSX.Element {
	return (
		<div
			className={cx(styles.row, isNested && styles.nestedRow)}
			data-testid={testId}
		>
			<Typography
				variant="paragraph"
				size="small"
				weight="regular"
				color={isHeading ? 'inherit' : 'secondary'}
				as="span"
				display="inline-block"
				minWidth={0}
				textOverflow="wrap"
			>
				{label}
			</Typography>
			{value !== undefined && (
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="inherit"
					as="span"
					display="inline-block"
					align="end"
					minWidth={0}
					textOverflow="wrap"
					tabularNumbers
				>
					{value}
				</Typography>
			)}
		</div>
	);
}

export default TraceTooltipRow;
