import { MessagePart as MessagePartType } from '../TraceDetailsThread/types';
import MediaPart from './parts/MediaPart';
import ThinkingPart from './parts/ThinkingPart';
import ToolCallPart from './parts/ToolCallPart';
import ToolResultPart from './parts/ToolResultPart';
import TextContent from './TextContent';

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
		case 'thinking':
			return <ThinkingPart content={part.content} />;
		case 'tool_call':
			return (
				<ToolCallPart
					id={part.id}
					name={part.name}
					args={part.arguments}
					server={part.server}
				/>
			);
		case 'tool_result':
			return (
				<ToolResultPart
					toolCallId={part.toolCallId}
					name={part.name}
					content={part.content}
					isError={part.isError}
					isLinkEnabled={!!isToolLinkEnabled?.(part.toolCallId)}
					onLinkClick={onToolLinkClick}
				/>
			);
		case 'media':
			return (
				<MediaPart
					modality={part.modality}
					mimeType={part.mimeType}
					name={part.name}
				/>
			);
		case 'generic':
			return <TextContent text={part.content} />;
		default:
			return null;
	}
}

MessagePart.defaultProps = {
	isToolLinkEnabled: undefined,
	onToolLinkClick: undefined,
};

export default MessagePart;
