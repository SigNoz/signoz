import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import { AuditOutcome } from '../../AuditLogs.types';

import styles from './OutcomeCell.module.scss';

interface OutcomeCellProps {
	outcome: AuditOutcome;
}

export function OutcomeCell({ outcome }: OutcomeCellProps): JSX.Element {
	return (
		<span
			className={cx(
				styles.pill,
				outcome === AuditOutcome.SUCCESS ? styles.success : styles.failure,
			)}
			data-testid="audit-logs-outcome"
		>
			<span className={styles.dot} />
			<Typography
				variant="uppercase"
				size="small"
				weight="bold"
				color="inherit"
				as="span"
				textOverflow="wrap"
			>
				{outcome}
			</Typography>
		</span>
	);
}
