import type { ReactNode } from 'react';
import cx from 'classnames';

import styles from './ConfigField.module.scss';

interface ConfigFieldProps {
	label: ReactNode;
	/** Shown at the end of the heading row, before Reset. */
	aside?: ReactNode;
	/** Shown under the control. */
	help?: ReactNode;
	changed?: boolean;
	onReset?: () => void;
	/** Plain body label instead of the uppercase field heading. */
	plain?: boolean;
	className?: string;
	children: ReactNode;
}

function ConfigField({
	label,
	aside,
	help,
	changed,
	onReset,
	plain,
	className,
	children,
}: ConfigFieldProps): JSX.Element {
	return (
		<div className={cx(styles.field, className)}>
			<div className={styles.header}>
				<span className={plain ? styles.plainLabel : styles.label}>{label}</span>
				{aside && <span className={styles.aside}>{aside}</span>}
				{changed && onReset && (
					<button
						type="button"
						className={styles.reset}
						data-testid="config-field-reset"
						onClick={onReset}
					>
						Reset
					</button>
				)}
			</div>
			{children}
			{help && <span className={styles.help}>{help}</span>}
		</div>
	);
}

export default ConfigField;
