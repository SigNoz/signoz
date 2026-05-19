import { useEffect, useRef, useState } from 'react';
import cx from 'classnames';
import { ChevronDown, ChevronRight, Sparkles } from '@signozhq/icons';

import { StreamingToolCall } from '../../types';
import ThinkingStep from '../ThinkingStep';
import ToolCallStep from '../ToolCallStep';

import styles from './ActivityGroup.module.scss';

export type ActivityItem =
	| { kind: 'thinking'; content: string }
	| { kind: 'tool'; toolCall: StreamingToolCall };

interface ActivityGroupProps {
	items: ActivityItem[];
	/**
	 * True while this group is the trailing activity in an ongoing stream —
	 * the underlying steps may still be growing or a tool may still be
	 * running. Drives the live "Working…" label and elapsed-time tick.
	 */
	isLive?: boolean;
}

function formatElapsed(ms: number): string {
	if (ms < 1000) {
		return '<1s';
	}
	const seconds = Math.round(ms / 1000);
	if (seconds < 60) {
		return `${seconds}s`;
	}
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

/**
 * Single collapsed summary row that hides a run of thinking + tool-call steps.
 * Expands to show each underlying step inline.
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
			// Entering a fresh live phase — reset the clock.
			startedAtRef.current = Date.now();
			setElapsed(0);
		}
		wasLiveRef.current = isLive;

		if (!isLive) {
			return undefined;
		}
		const id = window.setInterval(() => {
			setElapsed(Date.now() - startedAtRef.current);
		}, 500);
		return (): void => window.clearInterval(id);
	}, [isLive]);

	const stepCount = items.length;
	const stepLabel = stepCount === 1 ? '1 step' : `${stepCount} steps`;

	let summary: string;
	if (isLive) {
		summary =
			elapsed > 0
				? `Working… · ${formatElapsed(elapsed)} · ${stepLabel}`
				: `Working… · ${stepLabel}`;
	} else {
		summary = `Worked through ${stepLabel}`;
	}

	const toggle = (): void => setExpanded((v) => !v);

	return (
		<div className={styles.group}>
			<button type="button" className={styles.header} onClick={toggle}>
				<Sparkles
					size={12}
					className={cx(styles.icon, { [styles.spin]: isLive })}
				/>
				<span className={styles.label}>{summary}</span>
				{expanded ? (
					<ChevronDown size={12} className={styles.chevron} />
				) : (
					<ChevronRight size={12} className={styles.chevron} />
				)}
			</button>

			{expanded && (
				<div className={styles.body}>
					{/* eslint-disable react/no-array-index-key */}
					{items.map((item, i) => {
						// A thinking step is live only while it's the trailing item in
						// a trailing live group — once any later event (text or tool)
						// arrives, the pass is done.
						const isLastItem = i === items.length - 1;
						return item.kind === 'thinking' ? (
							<ThinkingStep
								key={i}
								content={item.content}
								isLive={isLive && isLastItem}
							/>
						) : (
							<ToolCallStep key={i} toolCall={item.toolCall} />
						);
					})}
					{/* eslint-enable react/no-array-index-key */}
				</div>
			)}
		</div>
	);
}
