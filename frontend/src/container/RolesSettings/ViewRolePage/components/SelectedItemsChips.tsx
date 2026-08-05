import { Badge } from '@signozhq/ui/badge';
import styles from './SelectedItemsChips.module.scss';
import { useId } from 'react';

export interface SelectedItemsChipsProps {
	ids: string[];
	testId?: string;
}

function SelectedItemsChips({
	ids,
	testId,
}: SelectedItemsChipsProps): JSX.Element {
	const componentId = useId();

	return (
		<ul className={styles.chips} data-testid={testId}>
			{ids.map((id) => (
				<Badge
					key={`selector-badge-${componentId}-${id}`}
					variant="outline"
					color="secondary"
				>
					{id}
				</Badge>
			))}
		</ul>
	);
}

export default SelectedItemsChips;
