import AIThreadMessage, {
	AIThreadMessageProps,
} from '../AIThreadMessage/AIThreadMessage';
import { ThreadMessage } from '../AIThreadMessage/types';
import { ThreadView } from '../TraceDetailsThread/types';
import RawMessages from './RawMessages';
import { RawMessagesValue } from '../utils/spanMessages';

import styles from './SpanMessages.module.scss';

type MessageProps = Pick<
	AIThreadMessageProps,
	'messageType' | 'canLinkToToolCall' | 'onToolLinkClick'
>;

interface MessagesSectionProps extends MessageProps {
	title?: string;
	view: ThreadView;
	messages: ThreadMessage[];
	raw?: RawMessagesValue;
	testId: string;
}

function MessagesSection({
	title,
	view,
	messages,
	raw,
	testId,
	messageType,
	canLinkToToolCall,
	onToolLinkClick,
}: MessagesSectionProps): JSX.Element | null {
	const isFormatted = view === ThreadView.Formatted;
	if (isFormatted ? messages.length === 0 : !raw) {
		return null;
	}

	return (
		<section className={styles.section} data-testid={testId}>
			{title && <div className={styles.sectionTitle}>{title}</div>}
			{isFormatted ? (
				<div className={styles.messages}>
					{messages.map((message, index) => (
						<AIThreadMessage
							// Messages have no stable id and never reorder.
							// eslint-disable-next-line react/no-array-index-key
							key={index}
							message={message}
							messageType={messageType}
							canLinkToToolCall={canLinkToToolCall}
							onToolLinkClick={onToolLinkClick}
						/>
					))}
				</div>
			) : (
				<RawMessages value={raw as RawMessagesValue} />
			)}
		</section>
	);
}

MessagesSection.defaultProps = {
	title: undefined,
	raw: undefined,
};

export default MessagesSection;
