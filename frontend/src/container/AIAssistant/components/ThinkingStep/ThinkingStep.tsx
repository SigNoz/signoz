import { useState } from 'react';
import { ChevronDown, ChevronRight } from '@signozhq/icons';

import styles from './ThinkingStep.module.scss';

interface ThinkingStepProps {
	content: string;
}

/** Collapsible thinking row — chevron + label, content in the expanded body. */
export default function ThinkingStep({
	content,
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
				<span className={styles.label}>Thinking</span>
			</div>

			{expanded && (
				<div className={styles.body}>
					<p className={styles.content}>{content}</p>
				</div>
			)}
		</div>
	);
}
