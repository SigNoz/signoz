import { useState } from 'react';
import cx from 'classnames';
import { ChevronDown, ChevronRight, LoaderCircle } from '@signozhq/icons';

import { StreamingToolCall } from '../../types';

import styles from './ToolCallStep.module.scss';

interface ToolCallStepProps {
	toolCall: StreamingToolCall;
}

/** Collapsible tool-call row — chevron + label, in/out detail in the body. */
export default function ToolCallStep({
	toolCall,
}: ToolCallStepProps): JSX.Element {
	const [expanded, setExpanded] = useState(false);
	const { toolName, input, result, done, displayText } = toolCall;

	// Prefer the server-supplied `displayText` from `ToolCallEventDTO` —
	// it's the human-friendly title the backend wants surfaced. Fall back
	// to a derived label ("signoz_get_dashboard" → "Get Dashboard") when
	// the field is empty / null / missing.
	const label =
		displayText && displayText.trim().length > 0
			? displayText
			: toolName
					.replace(/^[a-z]+_/, '') // strip prefix like "signoz_"
					.replace(/_/g, ' ')
					.replace(/\b\w/g, (c) => c.toUpperCase());

	const toggle = (): void => setExpanded((v) => !v);

	return (
		<div className={cx(styles.row, { [styles.running]: !done })}>
			<div className={styles.header} onClick={toggle}>
				{!done ? (
					<LoaderCircle size={12} className={cx(styles.chevron, styles.spin)} />
				) : expanded ? (
					<ChevronDown size={12} className={styles.chevron} />
				) : (
					<ChevronRight size={12} className={styles.chevron} />
				)}
				<span className={styles.label}>{label}</span>
			</div>

			{expanded && (
				<div className={styles.body}>
					<div className={styles.section}>
						<span className={styles.sectionLabel}>Tool</span>
						<span className={styles.toolName}>{toolName}</span>
					</div>
					<div className={styles.section}>
						<span className={styles.sectionLabel}>Input</span>
						<pre className={styles.json}>{JSON.stringify(input, null, 2)}</pre>
					</div>
					{done && result !== undefined && (
						<div className={styles.section}>
							<span className={styles.sectionLabel}>Output</span>
							<pre className={styles.json}>
								{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
