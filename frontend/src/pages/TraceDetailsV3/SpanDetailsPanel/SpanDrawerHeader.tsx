import { Button } from '@signozhq/ui/button';
import { Divider } from '@signozhq/ui/divider';
import { X } from '@signozhq/icons';
import type { HeaderAction } from 'components/DetailsPanel';

import styles from './SpanDrawerHeader.module.scss';

interface SpanDrawerHeaderProps {
	title: string;
	onClose: () => void;
	actions: HeaderAction[];
}

function SpanDrawerHeader({
	title,
	onClose,
	actions,
}: SpanDrawerHeaderProps): JSX.Element {
	return (
		<div className={styles.header}>
			<Button
				variant="ghost"
				color="secondary"
				size="md"
				icon
				aria-label="Close"
				onClick={onClose}
				testId="span-drawer-close"
			>
				<X />
			</Button>
			<Divider orientation="vertical" height={16} spacing="0 var(--spacing-4)" />
			<span className={styles.title}>{title}</span>
			<div className={styles.actions}>
				{actions.map((action) => (
					<div key={action.key}>{action.component}</div>
				))}
			</div>
		</div>
	);
}

export default SpanDrawerHeader;
