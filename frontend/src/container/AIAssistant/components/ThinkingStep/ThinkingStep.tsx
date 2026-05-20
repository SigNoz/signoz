import { useState } from 'react';
import { ChevronDown, ChevronRight } from '@signozhq/icons';

import styles from './ThinkingStep.module.scss';

interface ThinkingStepProps {
	content: string;
	/**
	 * When false, label reads "Thought for a few seconds" — intentionally
	 * vague because the API doesn't persist precise timing, so showing
	 * seconds would be inconsistent between fresh and reloaded threads.
	 */
	isLive?: boolean;
}

/** Body of a thinking step — extracted so ActivityGroup can render it directly. */
export function ThinkingContent({ content }: { content: string }): JSX.Element {
	return (
		<div className={styles.body}>
			<p className={styles.content}>{content}</p>
		</div>
	);
}

export function thinkingLabel(isLive: boolean): string {
	return isLive ? 'Thinking…' : 'Thought for a few seconds';
}

/** Collapsible thinking row — chevron + label, content in the expanded body. */
export default function ThinkingStep({
	content,
	isLive = false,
}: ThinkingStepProps): JSX.Element {
	const [expanded, setExpanded] = useState(false);

	const toggle = (): void => setExpanded((v) => !v);

	return (
		<div className={styles.row}>
			<div className={styles.header} onClick={toggle}>
				{expanded ? (
					<ChevronDown size={12} className={styles.chevron} />
				) : (
					<ChevronRight size={12} className={styles.chevron} />
				)}
				<span className={styles.label}>{thinkingLabel(isLive)}</span>
			</div>

			{expanded && <ThinkingContent content={content} />}
		</div>
	);
}
