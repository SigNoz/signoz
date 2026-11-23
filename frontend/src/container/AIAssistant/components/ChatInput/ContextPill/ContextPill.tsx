import { Button } from '@signozhq/ui/button';
import { Package, X } from '@signozhq/icons';

import styles from './ContextPill.module.scss';

interface ContextPillProps {
	icon: typeof Package;
	category: string;
	label: string;
	onRemove?: () => void;
}

/** A context attached to the next message; the remove button shows on hover or focus. */
export default function ContextPill({
	icon: Icon,
	category,
	label,
	onRemove,
}: ContextPillProps): JSX.Element {
	return (
		<div
			className={styles.pill}
			title={`${category}: ${label}`}
			data-testid="ai-context-pill"
		>
			<Icon size={14} className={styles.icon} />
			<span className={styles.category}>{category} :</span>
			<span className={styles.label}>{label}</span>
			{onRemove && (
				<Button
					variant="link"
					size="sm"
					icon
					color="secondary"
					onClick={onRemove}
					aria-label={`Remove ${category}: ${label} context`}
					testId="ai-context-pill-remove"
				>
					<X size={12} />
				</Button>
			)}
		</div>
	);
}
