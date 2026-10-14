import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from '@signozhq/icons';

import { AIThreadMessageProps } from '../../AIThreadMessage/AIThreadMessage';
import { ThreadMessage } from '../../AIThreadMessage/types';
import MessagesSection from '../../SpanMessages/MessagesSection';
import { RawMessagesValue } from '../../SpanMessages/utils';
import { ThreadView } from '../../TraceDetailsThread/types';
import ThreadViewToggle from '../../TraceDetailsThread/ThreadViewToggle';

import styles from './MessagesAccordion.module.scss';

interface MessagesAccordionProps extends Pick<
	AIThreadMessageProps,
	'isOutput' | 'canLinkToToolCall' | 'onToolLinkClick'
> {
	icon: ReactNode;
	title: string;
	messages: ThreadMessage[];
	raw?: RawMessagesValue;
	testId: string;
}

function MessagesAccordion({
	icon,
	title,
	messages,
	raw,
	testId,
	isOutput,
	canLinkToToolCall,
	onToolLinkClick,
}: MessagesAccordionProps): JSX.Element | null {
	const [isOpen, setIsOpen] = useState(true);
	const [view, setView] = useState(ThreadView.Formatted);
	const canFormat = messages.length > 0;
	const effectiveView = canFormat ? view : ThreadView.Json;

	if (!canFormat && !raw) {
		return null;
	}

	return (
		<section className={styles.accordion} data-testid={testId}>
			<div className={styles.header}>
				<span className={styles.title}>
					{icon}
					{title}
				</span>
				{isOpen && canFormat && (
					<ThreadViewToggle
						value={effectiveView}
						onChange={setView}
						testId={`${testId}-view-toggle`}
					/>
				)}
				<button
					type="button"
					className={styles.chevron}
					onClick={(): void => setIsOpen((prev) => !prev)}
					aria-expanded={isOpen}
					aria-label={`Toggle ${title}`}
					data-testid={`${testId}-toggle`}
				>
					{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
				</button>
			</div>
			{isOpen && (
				<div className={styles.body}>
					<MessagesSection
						view={effectiveView}
						messages={messages}
						raw={raw}
						testId={`${testId}-body`}
						isOutput={isOutput}
						canLinkToToolCall={canLinkToToolCall}
						onToolLinkClick={onToolLinkClick}
					/>
				</div>
			)}
		</section>
	);
}

MessagesAccordion.defaultProps = {
	raw: undefined,
};

export default MessagesAccordion;
