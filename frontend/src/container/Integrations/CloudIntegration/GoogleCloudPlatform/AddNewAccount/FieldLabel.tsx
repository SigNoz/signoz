import { Info } from '@signozhq/icons';
import { TooltipSimple } from '@signozhq/ui/tooltip';

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

			<TooltipSimple
				title={tooltip}
				side="top"
				tooltipContentProps={{ className: styles.tooltipContent }}
			>
				<span
					className={styles.infoTrigger}
					aria-label={`${label} help`}
					data-testid={`${htmlFor}-tooltip`}
				>
					<Info size={12} />
				</span>
			</TooltipSimple>
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
