import { useEffect, useRef, useState } from 'react';
import cx from 'classnames';
import { ChevronDown, ChevronRight, Sparkles } from '@signozhq/icons';

import { formatTime } from 'utils/timeUtils';

import { StreamingToolCall } from '../../types';
import ThinkingStep, { ThinkingContent, thinkingLabel } from '../ThinkingStep';
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
	/**
	 * True only for the trailing activity group of an active stream — drives
	 * the live "Working…" label and the elapsed-time tick (which re-stamps on
	 * approval/clarification resume so wait time isn't counted).
	 */
	isLive?: boolean;
}

/**
 * Single-item groups get a step-specific summary so the user doesn't see a
 * pointless "Worked through 1 step". Multi-item groups roll up into the
 * generic "Working… / Worked through N steps" treatment.
 */
function buildSummary(
	items: ActivityItem[],
	isLive: boolean,
	elapsed: number,
): string {
	if (items.length === 1) {
		const [only] = items;
		if (only.kind === 'thinking') {
			return thinkingLabel(isLive);
		}
		return getToolDisplayLabel(only.toolCall);
	}
	const stepLabel = `${items.length} steps`;
	if (!isLive) {
		return `Worked through ${stepLabel}`;
	}
	// Suppress the elapsed token until ≥ 1s — the first tick fires after
	// 1s anyway, and showing "0s" or "<1s" briefly adds noise.
	return elapsed >= 1000
		? `Working… · ${formatTime(elapsed / 1000)} · ${stepLabel}`
		: `Working… · ${stepLabel}`;
}

/**
 * Single collapsed summary row that hides a run of thinking + tool-call steps.
 * Expands to show each underlying step inline. Used for every activity row
 * (including single-item ones) so all "what the agent did" rows share a
 * consistent ✨-led visual contract.
 */
export default function ActivityGroup({
	items,
	isLive = false,
}: ActivityGroupProps): JSX.Element {
	const [expanded, setExpanded] = useState(false);

	// Captures the moment this live phase started. Re-stamped on every
	// false→true transition so a stream that pauses on
	// approval/clarification and resumes doesn't roll the user's wait time
	// into the elapsed counter.
	const startedAtRef = useRef<number>(Date.now());
	const wasLiveRef = useRef<boolean>(isLive);
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		if (isLive && !wasLiveRef.current) {
			startedAtRef.current = Date.now();
			setElapsed(0);
		}
		wasLiveRef.current = isLive;

		if (!isLive) {
			return undefined;
		}
		// Tick once per second — the display is integer-second precision, so
		// faster ticks would just re-render the bubble for no visible change.
		const id = window.setInterval(() => {
			setElapsed(Date.now() - startedAtRef.current);
		}, 1000);
		return (): void => window.clearInterval(id);
	}, [isLive]);

	const summary = buildSummary(items, isLive, elapsed);
	const isSingle = items.length === 1;

	const toggle = (): void => setExpanded((v) => !v);

	return (
		<div className={styles.activityGroup}>
			<div className={styles.activityHeader} onClick={toggle}>
				<Sparkles
					size={12}
					className={cx(styles.sparkleIcon, { [styles.iconPulsing]: isLive })}
				/>
				<span className={styles.activitySummary}>{summary}</span>
				{expanded ? (
					<ChevronDown size={12} className={styles.toggleChevron} />
				) : (
					<ChevronRight size={12} className={styles.toggleChevron} />
				)}
			</div>

			{expanded && (
				<div className={styles.activityBody}>
					{isSingle ? (
						// Single-item: the outer chevron already provides disclosure,
						// so render the underlying content directly instead of wrapping
						// it in a second collapsible step row.
						items[0].kind === 'thinking' ? (
							<ThinkingContent content={items[0].content} />
						) : (
							<ToolCallContent toolCall={items[0].toolCall} />
						)
					) : (
						items.map((item, i) => {
							// A thinking step is live only while it's the trailing item
							// in a trailing live group — once any later event (text or
							// tool) arrives, the pass is done.
							const isLastItem = i === items.length - 1;
							return item.kind === 'thinking' ? (
								<ThinkingStep
									key={item.id}
									content={item.content}
									isLive={isLive && isLastItem}
								/>
							) : (
								<ToolCallStep key={item.id} toolCall={item.toolCall} />
							);
						})
					)}
				</div>
			)}
		</div>
	);
}
