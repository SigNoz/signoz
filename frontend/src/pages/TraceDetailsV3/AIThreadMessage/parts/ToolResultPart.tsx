import { MouseEvent, useMemo } from 'react';
import { CornerUpRight } from '@signozhq/icons';

import PartChip from '../PartChip';
import TextContent from '../TextContent';
import { MAX_INLINE_RESULT_LENGTH, parseJsonObject } from '../utils';

import styles from '../AIThreadMessage.module.scss';

interface ToolResultPartProps {
	toolCallId: string;
	name?: string;
	content: string;
	isError?: boolean;
	isLinkEnabled: boolean;
	onLinkClick?: (toolCallId: string) => void;
}

function ToolResultPart({
	toolCallId,
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
		onLinkClick?.(toolCallId);
	};

	return (
		<div className={styles.toolResult} data-testid="ai-tool-result">
			<PartChip
				label="tool_result"
				value={isInline ? content || '…' : name || toolCallId}
				tone={isError ? 'error' : 'success'}
			>
				<button
					type="button"
					className={styles.toolLink}
					disabled={!isLinkEnabled}
					onClick={handleLinkClick}
					title={
						isLinkEnabled ? 'Go to tool call' : 'Matching tool call is not loaded'
					}
					data-testid="ai-tool-result-link"
				>
					<CornerUpRight size={12} />
				</button>
			</PartChip>
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
