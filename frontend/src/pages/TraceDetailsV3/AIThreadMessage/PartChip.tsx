import { ReactNode } from 'react';

import { MessageTone } from './utils';

import styles from './AIThreadMessage.module.scss';

interface PartChipProps {
	label: string;
	value?: ReactNode;
	tone?: MessageTone;
	testId?: string;
	children?: ReactNode;
}

function PartChip({
	label,
	value,
	tone = 'success',
	testId,
	children,
}: PartChipProps): JSX.Element {
	return (
		<span className={styles.chip} data-testid={testId}>
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
	testId: undefined,
	children: undefined,
};

export default PartChip;
