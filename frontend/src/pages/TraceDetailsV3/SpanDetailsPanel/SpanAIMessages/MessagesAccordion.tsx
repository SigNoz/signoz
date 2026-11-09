import { MouseEvent, ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from '@signozhq/icons';
import { Collapse } from 'antd';

import { AIThreadMessageProps } from '../../AIThreadMessage/AIThreadMessage';
import { ThreadMessage } from '../../AIThreadMessage/types';
import MessagesSection from '../../SpanMessages/MessagesSection';
import { ThreadView } from '../../TraceDetailsThread/types';
import ThreadViewToggle from '../../TraceDetailsThread/ThreadViewToggle';

import styles from './MessagesAccordion.module.scss';

const PANEL_KEY = 'messages';

interface MessagesAccordionProps extends Pick<
	AIThreadMessageProps,
	'messageType' | 'canLinkToToolCall' | 'onToolLinkClick'
> {
	icon: ReactNode;
	title: string;
	messages: ThreadMessage[];
	testId: string;
}

function MessagesAccordion({
	icon,
	title,
	messages,
	testId,
	messageType,
	canLinkToToolCall,
	onToolLinkClick,
}: MessagesAccordionProps): JSX.Element | null {
	const [isOpen, setIsOpen] = useState(false);
	const [view, setView] = useState(ThreadView.Formatted);

	if (messages.length === 0) {
		return null;
	}

	const stopToggle = (event: MouseEvent): void => event.stopPropagation();

	return (
		<section data-testid={testId}>
			<Collapse
				className={styles.accordion}
				activeKey={isOpen ? [PANEL_KEY] : []}
				onChange={(): void => setIsOpen((prev) => !prev)}
				expandIconPosition="end"
				expandIcon={({ isActive }): JSX.Element => (
					<span className={styles.chevron} data-testid={`${testId}-toggle`}>
						{isActive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
					</span>
				)}
				items={[
					{
						key: PANEL_KEY,
						label: (
							<span className={styles.title}>
								{icon}
								{title}
							</span>
						),
						extra: isOpen && (
							// The view toggle lives in the header; its clicks must not fold the panel.
							// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
							<span onClick={stopToggle}>
								<ThreadViewToggle
									value={view}
									onChange={setView}
									testId={`${testId}-view-toggle`}
								/>
							</span>
						),
						children: (
							<MessagesSection
								view={view}
								messages={messages}
								testId={`${testId}-body`}
								messageType={messageType}
								canLinkToToolCall={canLinkToToolCall}
								onToolLinkClick={onToolLinkClick}
							/>
						),
					},
				]}
			/>
		</section>
	);
}

export default MessagesAccordion;
