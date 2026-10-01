import type { ReactNode } from 'react';

import styles from './ConfigInlineField.module.scss';

interface ConfigInlineFieldProps {
	label: string;
	/** Shown under the control. */
	help?: ReactNode;
	helpTestId?: string;
	children: ReactNode;
}

/** A field whose heading sits beside the control rather than above it. */
function ConfigInlineField({
	label,
	help,
	helpTestId,
	children,
}: ConfigInlineFieldProps): JSX.Element {
	return (
		<div className={styles.row}>
			<span className={styles.label}>{label}</span>
			{children}
			{help && (
				<span className={styles.help} data-testid={helpTestId}>
					{help}
				</span>
			)}
		</div>
	);
}

export default ConfigInlineField;
