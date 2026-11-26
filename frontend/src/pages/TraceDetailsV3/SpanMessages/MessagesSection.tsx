import AIThreadMessage, {
	AIThreadMessageProps,
} from '../AIThreadMessage/AIThreadMessage';
import { ThreadMessage } from '../AIThreadMessage/types';
import { ThreadView } from '../TraceDetailsThread/types';
import JsonBlock from '../AIThreadMessage/JsonBlock';

import styles from './SpanMessages.module.scss';

type MessageProps = Pick<
	AIThreadMessageProps,
	'messageType' | 'canLinkToToolCall' | 'onToolLinkClick'
>;

interface MessagesSectionProps extends MessageProps {
	title?: string;
	view: ThreadView;
	messages: ThreadMessage[];
	testId: string;
}

function MessagesSection({
	title,
	view,
	messages,
	testId,
	messageType,
	canLinkToToolCall,
	onToolLinkClick,
}: MessagesSectionProps): JSX.Element | null {
	if (messages.length === 0) {
		return null;
	}

	return (
		<section className={styles.section} data-testid={testId}>
			{title && <div className={styles.sectionTitle}>{title}</div>}
			{view === ThreadView.Formatted ? (
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
				<JsonBlock data={messages} />
			)}
		</section>
	);
}

MessagesSection.defaultProps = {
	title: undefined,
};

export default MessagesSection;
