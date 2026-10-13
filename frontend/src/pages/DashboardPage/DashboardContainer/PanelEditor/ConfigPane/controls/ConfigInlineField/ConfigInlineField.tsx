import type { ReactNode } from 'react';
import { Callout } from '@signozhq/ui/callout';

import styles from './ConfigInlineField.module.scss';

interface ConfigInlineFieldProps {
	label: string;
	/** Shown under the control. */
	help?: ReactNode;
	helpTestId?: string;
	/** Shown in place of the help. */
	error?: ReactNode;
	children: ReactNode;
}

/** A field whose heading sits beside the control rather than above it. */
function ConfigInlineField({
	label,
	help,
	helpTestId,
	error,
	children,
}: ConfigInlineFieldProps): JSX.Element {
	return (
		<div className={styles.row}>
			<span className={styles.label}>{label}</span>
			{children}
			{error ? (
				<div className={styles.help} data-testid={helpTestId}>
					<Callout type="error" size="small" showIcon>
						{error}
					</Callout>
				</div>
			) : (
				help && (
					<span className={styles.help} data-testid={helpTestId}>
						{help}
					</span>
				)
			)}
		</div>
	);
}

export default ConfigInlineField;
