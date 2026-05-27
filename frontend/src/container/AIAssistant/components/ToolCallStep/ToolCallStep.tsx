import { useState } from 'react';
import cx from 'classnames';
import { ChevronDown, ChevronRight, LoaderCircle } from '@signozhq/icons';

import { StreamingToolCall } from '../../types';

import styles from './ToolCallStep.module.scss';

interface ToolCallStepProps {
	toolCall: StreamingToolCall;
}

/**
 * Server-supplied `displayText` is the human-friendly title the backend
 * wants surfaced. Falls back to a derived label
 * ("signoz_get_dashboard" → "Get Dashboard") when missing.
 */
export function getToolDisplayLabel(toolCall: StreamingToolCall): string {
	const { toolName, displayText } = toolCall;
	if (displayText && displayText.trim().length > 0) {
		return displayText;
	}
	return toolName
		.replace(/^[a-z]+_/, '') // strip prefix like "signoz_"
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Body of a tool-call step — extracted so ActivityGroup can render it directly. */
export function ToolCallContent({
	toolCall,
}: {
	toolCall: StreamingToolCall;
}): JSX.Element {
	const { toolName, input, result, done } = toolCall;
	return (
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
	);
}

/** Collapsible tool-call row — chevron + label, in/out detail in the body. */
export default function ToolCallStep({
	toolCall,
}: ToolCallStepProps): JSX.Element {
	const [expanded, setExpanded] = useState(false);
	const { done } = toolCall;
	const label = getToolDisplayLabel(toolCall);

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

			{expanded && <ToolCallContent toolCall={toolCall} />}
		</div>
	);
}
