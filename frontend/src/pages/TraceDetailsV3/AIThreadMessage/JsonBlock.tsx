import { MouseEvent, useMemo, useRef, useState } from 'react';
import cx from 'classnames';
import CopyButton from 'periscope/components/CopyButton/CopyButton';
import { PrettyView } from 'periscope/components/PrettyView';
import { useResizeObserver } from 'hooks/useDimensions';

import styles from './AIThreadMessage.module.scss';

// Branch toggles (arrow, key, summary); PrettyView already stops its actions menu.
const TREE_TOGGLES = '.pretty-view__nested-row > :not(ul)';
const NO_ACTIONS = { leaf: [], nested: [] };
// 10 tree rows: 18px line-height plus 2px padding top and bottom.
const COLLAPSED_MAX_HEIGHT = 10 * 22;

interface JsonBlockProps {
	data: object;
}

// Expanding tree nodes must not count as a click on the message.
function JsonBlock({ data }: JsonBlockProps): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false);
	const text = useMemo(() => JSON.stringify(data, null, 2), [data]);
	const treeRef = useRef<HTMLDivElement>(null);
	const { height: treeHeight } = useResizeObserver(treeRef);
	const isLong = treeHeight > COLLAPSED_MAX_HEIGHT;
	const isClamped = isLong && !isExpanded;

	const stopTreeToggleFromSelectingCard = (event: MouseEvent): void => {
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
				className={cx(styles.json, isClamped && styles.jsonCollapsed)}
				style={isClamped ? { maxHeight: COLLAPSED_MAX_HEIGHT } : undefined}
				onClick={stopTreeToggleFromSelectingCard}
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
				<div ref={treeRef}>
					<PrettyView
						data={data as Record<string, unknown>}
						searchable={false}
						drawerKey="ai-thread-message"
						visibleActions={NO_ACTIONS}
					/>
				</div>
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

export default JsonBlock;
