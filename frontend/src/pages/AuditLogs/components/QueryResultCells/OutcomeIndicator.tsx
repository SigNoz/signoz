import cx from 'classnames';
import { FontSize } from 'container/OptionsMenu/types';

import { AuditOutcome } from '../../AuditLogs.types';

import styles from './OutcomeIndicator.module.scss';

const FONT_SIZE_CLASS: Record<FontSize, string> = {
	[FontSize.SMALL]: styles.small,
	[FontSize.MEDIUM]: styles.medium,
	[FontSize.LARGE]: styles.large,
};

interface OutcomeIndicatorProps {
	outcome: AuditOutcome;
	fontSize: FontSize;
	flush?: boolean;
}

export function OutcomeIndicator({
	outcome,
	fontSize,
	flush = false,
}: OutcomeIndicatorProps): JSX.Element {
	return (
		<div
			className={cx(
				styles.outcomeIndicator,
				FONT_SIZE_CLASS[fontSize],
				{ [styles.flush]: flush },
				outcome === AuditOutcome.SUCCESS ? styles.success : styles.failure,
			)}
			data-testid="audit-logs-outcome-indicator"
		/>
	);
}
