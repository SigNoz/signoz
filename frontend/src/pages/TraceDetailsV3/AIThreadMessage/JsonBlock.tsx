import { MouseEvent, useMemo, useState } from 'react';
import cx from 'classnames';
import CopyButton from 'periscope/components/CopyButton/CopyButton';
import { PrettyView } from 'periscope/components/PrettyView';

import { MAX_TEXT_LENGTH } from './utils';

import styles from './AIThreadMessage.module.scss';

// Branch toggles (arrow, key, summary); PrettyView already stops its actions menu.
const TREE_TOGGLES = '.pretty-view__nested-row > :not(ul)';
const NO_ACTIONS = { leaf: [], nested: [] };

interface JsonBlockProps {
	data: object;
	/** Clamp JSON longer than `MAX_TEXT_LENGTH` behind Show more. */
	isCollapsible?: boolean;
	/** Tree levels open on first render; 1 shows top-level keys closed. */
	expandDepth?: number;
}

// Expanding tree nodes must not count as a click on the message.
function JsonBlock({
	data,
	isCollapsible = true,
	expandDepth = 1,
}: JsonBlockProps): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false);
	const text = useMemo(() => JSON.stringify(data, null, 2), [data]);
	const isLong = isCollapsible && text.length > MAX_TEXT_LENGTH;

	const stopToggleClick = (event: MouseEvent): void => {
		if ((event.target as HTMLElement).closest(TREE_TOGGLES)) {
			event.stopPropagation();
		}
	};

	const handleToggle = (event: MouseEvent): void => {
		event.stopPropagation();
		setIsExpanded((prev) => !prev);
	};

	return (
		<div className={styles.jsonBlock}>
			{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
			<div
				className={cx(styles.json, isLong && !isExpanded && styles.jsonCollapsed)}
				onClick={stopToggleClick}
				data-testid="ai-json-block"
			>
				<span className={styles.jsonCopy}>
					<CopyButton
						value={text}
						size={12}
						ariaLabel="Copy JSON"
						testId="ai-json-copy"
					/>
				</span>
				<PrettyView
					data={data as Record<string, unknown>}
					searchable={false}
					drawerKey="ai-thread-message"
					visibleActions={NO_ACTIONS}
					expandDepth={expandDepth}
				/>
			</div>
			{isLong && (
				<button
					type="button"
					className={styles.showMore}
					onClick={handleToggle}
					data-testid="ai-json-show-more"
				>
					{isExpanded ? 'Show less' : 'Show more'}
				</button>
			)}
		</div>
	);
}

JsonBlock.defaultProps = {
	isCollapsible: true,
	expandDepth: 1,
};

export default JsonBlock;
