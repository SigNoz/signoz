import type { ReactNode } from 'react';
import { Badge } from '@signozhq/ui/badge';

interface ItemBadgeProps {
	children: ReactNode;
	testId?: string;
}

function ItemBadge({ children, testId }: ItemBadgeProps): JSX.Element {
	return (
		<Badge textTransform="none" variant="solid" color="secondary" testId={testId}>
			{children}
		</Badge>
	);
}

export default ItemBadge;
