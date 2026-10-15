import { MouseEvent } from 'react';
import { PrettyView } from 'periscope/components/PrettyView';

import styles from './AIThreadMessage.module.scss';

// Branch toggles (arrow, key, summary); PrettyView already stops its actions menu.
const TREE_TOGGLES = '.pretty-view__nested-row > :not(ul)';
const NO_ACTIONS = { leaf: [], nested: [] };

interface JsonBlockProps {
	data: object;
}

// Expanding tree nodes must not count as a click on the message.
function JsonBlock({ data }: JsonBlockProps): JSX.Element {
	const stopToggleClick = (event: MouseEvent): void => {
		if ((event.target as HTMLElement).closest(TREE_TOGGLES)) {
			event.stopPropagation();
		}
	};

	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div className={styles.json} onClick={stopToggleClick}>
			<PrettyView
				data={data as Record<string, unknown>}
				searchable={false}
				drawerKey="ai-thread-message"
				visibleActions={NO_ACTIONS}
			/>
		</div>
	);
}

export default JsonBlock;
