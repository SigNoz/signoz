import { MessagePart as MessagePartType } from '../TraceDetailsThread/types';
import JsonBlock from './JsonBlock';
import ThinkingPart from './parts/ThinkingPart';
import ToolCallPart from './parts/ToolCallPart';
import ToolResultPart from './parts/ToolResultPart';
import TextContent from './TextContent';
import { toDisplayText, truncateBlobContent } from './utils';

interface MessagePartProps {
	part: MessagePartType;
	isToolLinkEnabled?: (toolCallId: string) => boolean;
	onToolLinkClick?: (toolCallId: string) => void;
}

function MessagePart({
	part,
	isToolLinkEnabled,
	onToolLinkClick,
}: MessagePartProps): JSX.Element | null {
	switch (part.type) {
		case 'text':
			return <TextContent text={part.content} isMarkdown />;
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
				/>
			);
		case 'server_tool_call':
			return (
				<ToolCallPart
					id={part.id ?? ''}
					name={part.name ?? ''}
					args={part.server_tool_call}
					server
				/>
			);
		case 'tool_call_response':
		case 'server_tool_call_response': {
			const toolCallId = part.id ?? '';
			return (
				<ToolResultPart
					toolCallId={toolCallId}
					content={toDisplayText(
						part.type === 'tool_call_response'
							? part.response
							: part.server_tool_call_response,
					)}
					isLinkEnabled={!!toolCallId && !!isToolLinkEnabled?.(toolCallId)}
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
			return null;
	}
}

MessagePart.defaultProps = {
	isToolLinkEnabled: undefined,
	onToolLinkClick: undefined,
};

export default MessagePart;
