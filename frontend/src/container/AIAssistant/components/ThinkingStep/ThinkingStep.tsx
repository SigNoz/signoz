import { useState } from 'react';
import { ChevronDown, ChevronRight } from '@signozhq/icons';

import styles from './ThinkingStep.module.scss';

interface ThinkingStepProps {
	content: string;
	/**
	 * True only while this thinking pass is still in flight — i.e. the latest
	 * event in an active stream. Persisted (history) blocks and any thinking
	 * step followed by a later event default to false and read as
	 * "Thought for a few seconds". The phrase is intentionally vague: the API
	 * doesn't persist precise timing, so we'd be inconsistent across fresh
	 * vs reloaded threads if we tried to show seconds.
	 */
	isLive?: boolean;
}

/** Collapsible thinking row — chevron + label, content in the expanded body. */
export default function ThinkingStep({
	content,
	isLive = false,
}: ThinkingStepProps): JSX.Element {
	const [expanded, setExpanded] = useState(false);

	const toggle = (): void => setExpanded((v) => !v);

	const label = isLive ? 'Thinking…' : 'Thought for a few seconds';

	return (
		<div className={styles.row}>
			<div className={styles.header} onClick={toggle}>
				{expanded ? (
					<ChevronDown size={12} className={styles.chevron} />
				) : (
					<ChevronRight size={12} className={styles.chevron} />
				)}
				<span className={styles.label}>{label}</span>
			</div>

			{expanded && (
				<div className={styles.body}>
					<p className={styles.content}>{content}</p>
				</div>
			)}
		</div>
	);
}
