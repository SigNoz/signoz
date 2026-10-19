import { Info } from '@signozhq/icons';
import { Tooltip } from '@signozhq/ui/tooltip';

import styles from './FieldLabel.module.scss';

interface FieldLabelProps {
	htmlFor: string;
	label: string;
	tooltip: string;
	required?: boolean;
}

function FieldLabel({
	htmlFor,
	label,
	tooltip,
	required,
}: FieldLabelProps): JSX.Element {
	return (
		<label className={styles.fieldLabel} htmlFor={htmlFor}>
			{label}

			<Tooltip title={tooltip} side="top">
				<span
					className={styles.infoTrigger}
					aria-label={`${label} help`}
					data-testid={`${htmlFor}-tooltip`}
				>
					<Info size={12} />
				</span>
			</Tooltip>
			{required && (
				<span className={styles.required} aria-hidden="true">
					*
				</span>
			)}
		</label>
	);
}

FieldLabel.defaultProps = {
	required: false,
};

export default FieldLabel;
