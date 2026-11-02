import { Button } from '@signozhq/ui/button';
import { ChevronDown, ChevronRight } from '@signozhq/icons';
import styles from './ExpandedButtonWrapper.module.scss';
import { useEffect, useState } from 'react';

export function ExpandButtonWrapper({
	toggleExpanded,
	isExpanded,
	children,
}: {
	toggleExpanded: () => void;
	isExpanded: boolean;
	children?: React.ReactNode;
}): JSX.Element {
	// the state is duplicated because it takes a few ms to propagate using isExpanded
	// so this local is used to avoid this delay
	const [localIsExpanded, setLocalIsExpanded] = useState(isExpanded);

	useEffect(() => {
		setLocalIsExpanded(isExpanded);
	}, [isExpanded]);

	return (
		<div className={styles.expandButtonContainer}>
			<Button
				aria-label={localIsExpanded ? 'Collapse' : 'Expand'}
				variant="ghost"
				color="secondary"
				onClick={(e): void => {
					e.stopPropagation();
					setLocalIsExpanded((v) => !v);
					toggleExpanded();
				}}
				size="sm"
				icon
			>
				{localIsExpanded ? <ChevronDown /> : <ChevronRight />}
			</Button>
			{children}
		</div>
	);
}
