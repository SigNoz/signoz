import { MouseEvent, ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from '@signozhq/icons';
import cx from 'classnames';

import styles from './AIThreadMessage.module.scss';

interface CollapsibleBlockProps {
	label: ReactNode;
	// Boxed: full-width bordered row with the chevron on the right.
	isBoxed?: boolean;
	testId?: string;
	children: ReactNode;
}

function CollapsibleBlock({
	label,
	isBoxed = false,
	testId,
	children,
}: CollapsibleBlockProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(false);

	const handleToggle = (event: MouseEvent): void => {
		event.stopPropagation();
		setIsOpen((prev) => !prev);
	};

	return (
		<div className={cx(styles.collapsible, isBoxed && styles.boxed)}>
			<button
				type="button"
				className={styles.collapsibleToggle}
				onClick={handleToggle}
				aria-expanded={isOpen}
				data-testid={testId}
			>
				<span className={styles.collapsibleLabel}>{label}</span>
				{isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
			</button>
			{isOpen && <div className={styles.collapsibleBody}>{children}</div>}
		</div>
	);
}

CollapsibleBlock.defaultProps = {
	isBoxed: false,
	testId: undefined,
};

export default CollapsibleBlock;
