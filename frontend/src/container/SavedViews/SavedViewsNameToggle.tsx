import { ReactElement } from 'react';
import { Button } from '@signozhq/ui/button';

import styles from './SavedViewsNameToggle.module.scss';

function SavedViewsNameToggle({
	isOpen,
	onToggle,
	children,
}: {
	isOpen: boolean;
	onToggle?: () => void;
	children: ReactElement;
}): JSX.Element {
	if (!onToggle) {
		return children;
	}

	return (
		<span className={styles.toggle}>
			<Button
				variant="link"
				color="secondary"
				size="sm"
				textOverflow="hidden"
				onClick={onToggle}
				aria-expanded={isOpen}
				testId="saved-views-name-toggle"
			>
				{children}
			</Button>
		</span>
	);
}

export default SavedViewsNameToggle;
