import { type ReactNode } from 'react';
import { Badge, type BadgeProps } from '@signozhq/ui/badge';

interface TagBadgeProps {
	children: ReactNode;
	maxWidth?: BadgeProps['maxWidth'];
}

// The single sienna tag chip used wherever dashboards display tags — list rows
// and the details header. Kept as one component so the tag
// styling stays identical across all of them.
function TagBadge({ children, maxWidth }: TagBadgeProps): JSX.Element {
	return (
		<Badge color="archive" variant="outlined" maxWidth={maxWidth}>
			{children}
		</Badge>
	);
}

export default TagBadge;
