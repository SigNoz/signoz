import { Badge } from '@signozhq/ui/badge';

import { ThreadMessage } from '../TraceDetailsThread/types';
import CollapsibleBlock from './CollapsibleBlock';
import MessagePart from './MessagePart';
import PartChip from './PartChip';
import { getFinishReasonTone, getRoleLabel } from './utils';

import styles from './AIThreadMessage.module.scss';

export interface AIThreadMessageProps {
	message: ThreadMessage;
	isOutput?: boolean;
	isToolLinkEnabled?: (toolCallId: string) => boolean;
	onToolLinkClick?: (toolCallId: string) => void;
}

function AIThreadMessage({
	message,
	isOutput,
	isToolLinkEnabled,
	onToolLinkClick,
}: AIThreadMessageProps): JSX.Element {
	const { role, content, finishReason } = message;
	const roleLabel = getRoleLabel(role);
	const tone = getFinishReasonTone(finishReason);

	const parts = (
		<div className={styles.parts}>
			{content.length === 0 ? (
				<span className={styles.empty}>No content</span>
			) : (
				content.map((part, index) => (
					<MessagePart
						// Parts have no stable id and never reorder.
						// eslint-disable-next-line react/no-array-index-key
						key={index}
						part={part}
						isToolLinkEnabled={isToolLinkEnabled}
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
			{role === 'system' ? (
				<CollapsibleBlock label={roleLabel} testId="ai-message-system-toggle">
					{parts}
				</CollapsibleBlock>
			) : (
				<>
					{roleLabel && (
						<div className={styles.roleHeader}>
							{roleLabel}
							{isOutput && (
								<Badge color={tone} testId="ai-message-output-badge">
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
	isOutput: false,
	isToolLinkEnabled: undefined,
	onToolLinkClick: undefined,
};

export default AIThreadMessage;
