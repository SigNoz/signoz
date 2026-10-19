import { MouseEvent, useMemo } from 'react';
import { CornerUpRight } from '@signozhq/icons';

import PartChip from '../PartChip';
import TextContent from '../TextContent';
import { MAX_INLINE_RESULT_LENGTH, parseJsonObject } from '../utils';

import styles from '../AIThreadMessage.module.scss';

interface ToolResultPartProps {
	toolCallId: string;
	toolCallKey: string;
	type: 'tool_call_response' | 'server_tool_call_response';
	name?: string;
	content: string;
	isError?: boolean;
	isLinkEnabled: boolean;
	onLinkClick?: (toolCallKey: string) => void;
}

function ToolResultPart({
	toolCallId,
	toolCallKey,
	type,
	name,
	content,
	isError,
	isLinkEnabled,
	onLinkClick,
}: ToolResultPartProps): JSX.Element {
	// Short plain results fit in the chip; JSON or long ones render below it.
	const isInline = useMemo(
		() => content.length <= MAX_INLINE_RESULT_LENGTH && !parseJsonObject(content),
		[content],
	);

	const handleLinkClick = (event: MouseEvent): void => {
		event.stopPropagation();
		onLinkClick?.(toolCallKey);
	};

	const chip = (
		<PartChip
			label={type}
			value={isInline ? content || '…' : name || toolCallId}
			tone={isError ? 'error' : 'success'}
		>
			{isLinkEnabled && (
				<CornerUpRight size={12} className={styles.toolLinkIcon} />
			)}
		</PartChip>
	);

	return (
		<div className={styles.toolResult} data-testid="ai-tool-result">
			{isLinkEnabled ? (
				<button
					type="button"
					className={styles.toolLink}
					onClick={handleLinkClick}
					title="Go to tool call"
					data-testid="ai-tool-result-link"
				>
					{chip}
				</button>
			) : (
				chip
			)}
			{!isInline && <TextContent text={content} />}
		</div>
	);
}

ToolResultPart.defaultProps = {
	name: undefined,
	isError: false,
	onLinkClick: undefined,
};

export default ToolResultPart;
