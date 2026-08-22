import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Info } from '@signozhq/icons';
import cx from 'classnames';

import styles from './FieldLabel.module.scss';

interface FieldLabelProps {
	label: string;
	hint?: string;
	className?: string;
	testId?: string;
}

// Field label with its explanation tucked behind an info icon. Callers supply
// their own typography via className; this owns the icon and its alignment.
function FieldLabel({
	label,
	hint,
	className,
	testId,
}: FieldLabelProps): JSX.Element {
	return (
		<span className={cx(styles.label, className)}>
			{label}
			{hint && (
				// withPortal={false} — the drawer traps focus, so a portalled tooltip
				// would render outside it.
				<TooltipSimple title={hint} side="top" align="start" withPortal={false}>
					<button
						type="button"
						className={styles.labelInfo}
						aria-label={hint}
						data-testid={testId}
					>
						<Info size={12} />
					</button>
				</TooltipSimple>
			)}
		</span>
	);
}

export default FieldLabel;
