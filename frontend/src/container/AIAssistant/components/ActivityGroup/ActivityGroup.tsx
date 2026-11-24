import { useState } from 'react';
import cx from 'classnames';
import { ChevronDown, ChevronRight } from '@signozhq/icons';

import type { StreamingToolCall } from '../../types';
import ThinkingStep, { thinkingLabel } from '../ThinkingStep';
import ToolCallStep, {
	getToolDisplayLabel,
	ToolCallContent,
} from '../ToolCallStep';

import styles from './ActivityGroup.module.scss';

export type ActivityItem =
	| { id: string; kind: 'thinking'; content: string }
	| { id: string; kind: 'tool'; toolCall: StreamingToolCall };

interface ActivityGroupProps {
	items: ActivityItem[];
	/** The trailing group of an active stream: its row names the running step, shimmering. */
	isLive?: boolean;
}

/**
 * Single-item groups get a step-specific summary so the user doesn't see a
 * pointless "Worked through 1 step".
 */
function buildSummary(items: ActivityItem[], isLive: boolean): string {
	// While Noz works, the row names the step it's on.
	if (isLive) {
		const latest = items[items.length - 1];
		return latest.kind === 'thinking'
			? thinkingLabel(true)
			: getToolDisplayLabel(latest.toolCall);
	}
	if (items.length === 1) {
		const [only] = items;
		if (only.kind === 'thinking') {
			return thinkingLabel(false);
		}
		return getToolDisplayLabel(only.toolCall);
	}
	return `Worked through ${items.length} steps`;
}

/** A run of thinking and tool-call steps on a timeline, folded behind the running step, then a summary. */
export default function ActivityGroup({
	items,
	isLive = false,
}: ActivityGroupProps): JSX.Element {
	const [expanded, setExpanded] = useState(false);

	const toggle = (): void => setExpanded((v) => !v);
	const [solo] = items;
	const isSolo = items.length === 1;

	return (
		<div className={cx(styles.activityGroup, { [styles.live]: isLive })}>
			<button
				type="button"
				className={styles.activityHeader}
				onClick={toggle}
				aria-expanded={expanded}
				data-testid="ai-activity-toggle"
			>
				<span className={styles.activitySummary}>
					{buildSummary(items, isLive)}
				</span>
				{expanded ? (
					<ChevronDown size={14} className={styles.toggleChevron} />
				) : (
					<ChevronRight size={14} className={styles.toggleChevron} />
				)}
			</button>

			{/* The summary row already names a lone step, so show only what it did. */}
			{expanded && isSolo && (
				<div className={styles.soloBody}>
					{solo.kind === 'thinking' ? (
						<p className={styles.soloThought}>{solo.content.trim()}</p>
					) : (
						<ToolCallContent toolCall={solo.toolCall} />
					)}
				</div>
			)}

			{expanded && !isSolo && (
				<div className={styles.activityBody}>
					{items.map((item, i) => {
						// The newest step stays live until the next event, so a running reply always shows progress.
						const isStepLive = isLive && i === items.length - 1;
						return item.kind === 'thinking' ? (
							<ThinkingStep key={item.id} content={item.content} isLive={isStepLive} />
						) : (
							<ToolCallStep
								key={item.id}
								toolCall={item.toolCall}
								isLive={isStepLive}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
