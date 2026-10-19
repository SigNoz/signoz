import { Badge } from '@signozhq/ui/badge';

import { MessageType, ThreadMessage } from './types';
import CollapsibleBlock from './CollapsibleBlock';
import MessagePart from './MessagePart';
import PartChip from './PartChip';
import RoleLabel from './RoleLabel';
import { getFinishReasonTone, getRoleLabel } from './utils';

import styles from './AIThreadMessage.module.scss';

export interface AIThreadMessageProps {
	message: ThreadMessage;
	messageType?: MessageType;
	canLinkToToolCall?: (toolCallKey: string) => boolean;
	onToolLinkClick?: (toolCallKey: string) => void;
}

function AIThreadMessage({
	message,
	messageType,
	canLinkToToolCall,
	onToolLinkClick,
}: AIThreadMessageProps): JSX.Element {
	const { role, parts: messageParts, finish_reason: finishReason } = message;
	const roleLabel = getRoleLabel(role);
	const tone = getFinishReasonTone(finishReason);
	const isOutput = messageType === MessageType.Output;

	const parts = (
		<div className={styles.parts}>
			{messageParts.length === 0 ? (
				<span className={styles.empty}>No content</span>
			) : (
				messageParts.map((part, index) => (
					<MessagePart
						// eslint-disable-next-line react/no-array-index-key
						key={index}
						part={part}
						canLinkToToolCall={canLinkToToolCall}
						onToolLinkClick={onToolLinkClick}
					/>
				))
			)}
		</div>
	);

	return (
		<div
			className={styles.message}
			data-testid={`ai-thread-message-${role || 'unknown'}`}
		>
			{role === 'system' || role === 'developer' ? (
				<CollapsibleBlock
					label={roleLabel && <RoleLabel label={roleLabel} />}
					testId="ai-message-system-toggle"
				>
					{parts}
				</CollapsibleBlock>
			) : (
				<>
					{(roleLabel || isOutput) && (
						<div className={styles.roleHeader}>
							{roleLabel && <RoleLabel label={roleLabel} />}
							{isOutput && (
								<Badge
									variant="outlined"
									color="secondary"
									textTransform="none"
									testId="ai-message-output-badge"
								>
									Output
								</Badge>
							)}
						</div>
					)}
					{parts}
				</>
			)}
			{finishReason && (
				<PartChip
					label="Finish Reason"
					value={finishReason}
					tone={tone}
					testId="ai-message-finish-reason"
				/>
			)}
		</div>
	);
}

AIThreadMessage.defaultProps = {
	messageType: MessageType.Input,
	canLinkToToolCall: undefined,
	onToolLinkClick: undefined,
};

export default AIThreadMessage;
