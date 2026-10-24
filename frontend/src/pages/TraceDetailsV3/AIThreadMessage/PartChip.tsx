import { ReactNode } from 'react';
import cx from 'classnames';

import { MessageTone } from './utils';

import styles from './AIThreadMessage.module.scss';

interface PartChipProps {
	label: string;
	value?: ReactNode;
	tone?: MessageTone;
	// Plain: no chip background, for headers like a tool call's.
	isPlain?: boolean;
	testId?: string;
	children?: ReactNode;
}

function PartChip({
	label,
	value,
	tone = 'success',
	isPlain = false,
	testId,
	children,
}: PartChipProps): JSX.Element {
	return (
		<span
			className={cx(styles.chip, isPlain && styles.isPlain)}
			data-testid={testId}
		>
			<span className={styles.dot} data-tone={tone} />
			<span className={styles.chipLabel}>{label}</span>
			{value !== undefined && (
				<>
					<span className={styles.chipSeparator}>—</span>
					<span className={styles.chipValue}>{value}</span>
				</>
			)}
			{children}
		</span>
	);
}

PartChip.defaultProps = {
	value: undefined,
	tone: 'success',
	isPlain: false,
	testId: undefined,
	children: undefined,
};

export default PartChip;
