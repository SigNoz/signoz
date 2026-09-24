import { type MouseEvent, type ReactNode } from 'react';
import { X } from '@signozhq/icons';
import { Badge, type BadgeProps } from '@signozhq/ui/badge';

interface TagBadgeProps {
	children: ReactNode;
	// Show a remove button (editable contexts: create modal, settings drawer).
	closable?: boolean;
	onClose?: (event: MouseEvent<HTMLButtonElement>) => void;
	maxWidth?: BadgeProps['maxWidth'];
}

// The single sienna tag chip used everywhere dashboards render tags — list rows,
// the details header, and the tag editors. Kept as one component so the tag
// styling stays identical across all of them.
function TagBadge({
	children,
	closable,
	onClose,
	maxWidth,
}: TagBadgeProps): JSX.Element {
	return (
		<Badge
			color="archive"
			variant="outlined"
			maxWidth={maxWidth}
			suffix={
				closable ? (
					<button
						type="button"
						aria-label="Remove"
						onClick={(event): void => {
							onClose?.(event);
						}}
					>
						<X size={12} />
					</button>
				) : undefined
			}
		>
			{children}
		</Badge>
	);
}

export default TagBadge;
