import { useState } from 'react';

import { StreamingToolCall } from '../../types';
import ActivityStep from '../ActivityStep/ActivityStep';

import styles from './ToolCallStep.module.scss';

interface ToolCallStepProps {
	toolCall: StreamingToolCall;
	/** Still the newest step of a running reply, even once its own call is done. */
	isLive?: boolean;
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

/** The input and output of a tool call. */
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

/** A tool call on the activity timeline; its input and output open from the title. */
export default function ToolCallStep({
	toolCall,
	isLive = false,
}: ToolCallStepProps): JSX.Element {
	const [expanded, setExpanded] = useState(false);

	return (
		<ActivityStep
			title={getToolDisplayLabel(toolCall)}
			isLive={isLive || !toolCall.done}
			expanded={expanded}
			onToggle={(): void => setExpanded((v) => !v)}
		>
			{expanded && <ToolCallContent toolCall={toolCall} />}
		</ActivityStep>
	);
}
