import { MessagePart as MessagePartType } from './types';
import JsonBlock from './JsonBlock';
import ThinkingPart from './parts/ThinkingPart';
import ToolCallPart from './parts/ToolCallPart';
import ToolResultPart from './parts/ToolResultPart';
import TextContent from './TextContent';
import {
	isEmptyPart,
	toDisplayText,
	toToolCallKey,
	truncateBlobContent,
} from './utils';

import styles from './AIThreadMessage.module.scss';

const EMPTY_PART = (
	<span className={styles.empty} data-testid="ai-message-empty-part">
		No content
	</span>
);

interface MessagePartProps {
	part: MessagePartType;
	canLinkToToolCall?: (toolCallKey: string) => boolean;
	onToolLinkClick?: (toolCallKey: string) => void;
}

function MessagePart({
	part,
	canLinkToToolCall,
	onToolLinkClick,
}: MessagePartProps): JSX.Element {
	if (isEmptyPart(part)) {
		return EMPTY_PART;
	}
	switch (part.type) {
		case 'text':
			return <TextContent text={part.content} />;
		case 'reasoning':
			return <ThinkingPart content={part.content} />;
		case 'compaction':
			return (
				<ThinkingPart
					label="Compaction"
					content={part.content ?? undefined}
					testId="ai-message-compaction-toggle"
				/>
			);
		case 'tool_call':
			return (
				<ToolCallPart
					id={part.id ?? ''}
					name={part.name ?? ''}
					args={part.arguments}
					type={part.type}
				/>
			);
		case 'server_tool_call':
			return (
				<ToolCallPart
					id={part.id ?? ''}
					name={part.name ?? ''}
					args={part.server_tool_call}
					type={part.type}
				/>
			);
		case 'tool_call_response':
		case 'server_tool_call_response': {
			const toolCallId = part.id ?? '';
			const toolCallKey = toToolCallKey(
				toolCallId,
				part.type === 'server_tool_call_response',
			);
			return (
				<ToolResultPart
					toolCallId={toolCallId}
					toolCallKey={toolCallKey}
					type={part.type}
					content={toDisplayText(
						part.type === 'tool_call_response'
							? part.response
							: part.server_tool_call_response,
					)}
					isLinkEnabled={!!toolCallId && !!canLinkToToolCall?.(toolCallKey)}
					onLinkClick={onToolLinkClick}
				/>
			);
		}
		case 'blob':
		case 'file':
		case 'uri':
			return <JsonBlock data={truncateBlobContent(part)} />;
		case 'generic':
			return <TextContent text={toDisplayText(part.content)} />;
		default:
			return <TextContent text={toDisplayText(part)} />;
	}
}

MessagePart.defaultProps = {
	canLinkToToolCall: undefined,
	onToolLinkClick: undefined,
};

export default MessagePart;
