import { type MouseEvent, type ReactNode } from 'react';
import { Badge } from '@signozhq/ui/badge';

interface TagBadgeProps {
	children: ReactNode;
	// Show a remove button (editable contexts: create modal, settings drawer).
	closable?: boolean;
	onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
	className?: string;
}

// The single sienna tag chip used everywhere dashboards render tags — list rows,
// the details header, and the tag editors. Kept as one component so the tag
// styling stays identical across all of them.
function TagBadge({
	children,
	closable,
	onClose,
	className,
}: TagBadgeProps): JSX.Element {
	return (
		<Badge
			color="sienna"
			variant="outline"
			className={className}
			closable={closable}
			onClose={onClose}
		>
			{children}
		</Badge>
	);
}

export default TagBadge;
