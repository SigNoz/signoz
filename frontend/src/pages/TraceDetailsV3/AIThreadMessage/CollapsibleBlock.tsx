import { MouseEvent, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from '@signozhq/icons';
import { Collapse } from 'antd';
import cx from 'classnames';

import styles from './AIThreadMessage.module.scss';

const PANEL_KEY = 'content';

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
	// Toggling must not count as a click on the message card; the body still does.
	const stopToggleFromSelectingCard = (event: MouseEvent): void => {
		if ((event.target as HTMLElement).closest('.ant-collapse-header')) {
			event.stopPropagation();
		}
	};

	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div onClick={stopToggleFromSelectingCard}>
			<Collapse
				ghost
				className={cx(styles.collapsible, isBoxed && styles.boxed)}
				expandIconPosition="end"
				expandIcon={({ isActive }): JSX.Element => (
					<span className={styles.collapsibleChevron} data-testid={testId}>
						{isActive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
					</span>
				)}
				items={[{ key: PANEL_KEY, label, children }]}
			/>
		</div>
	);
}

CollapsibleBlock.defaultProps = {
	isBoxed: false,
	testId: undefined,
};

export default CollapsibleBlock;
