import { useMemo } from 'react';
import cx from 'classnames';

import { AIThreadMessageProps } from '../AIThreadMessage/AIThreadMessage';
import { ThreadSpan, ThreadView } from '../TraceDetailsThread/types';
import JsonBlock from '../AIThreadMessage/JsonBlock';
import { MessageType } from '../AIThreadMessage/types';
import MessagesSection from './MessagesSection';
import { getSpanMessages, hasFormattedMessages } from '../utils/spanMessages';

import styles from './SpanMessages.module.scss';

interface SpanMessagesProps extends Pick<
	AIThreadMessageProps,
	'canLinkToToolCall' | 'onToolLinkClick'
> {
	span: ThreadSpan;
	view: ThreadView;
	className?: string;
}

/** Input and output messages of one AI span, shared by Thread and Span Details. */
function SpanMessages({
	span,
	view,
	className,
	canLinkToToolCall,
	onToolLinkClick,
}: SpanMessagesProps): JSX.Element {
	const data = useMemo(() => getSpanMessages(span), [span]);

	if (!hasFormattedMessages(data)) {
		return (
			<div
				className={cx(styles.missing, className)}
				data-testid="span-messages-empty"
			>
				This span has no input or output.
			</div>
		);
	}

	if (view === ThreadView.Json) {
		return (
			<div className={cx(styles.root, className)} data-testid="span-messages-json">
				<JsonBlock
					data={{ input: data.formattedInput, output: data.formattedOutput }}
				/>
			</div>
		);
	}

	return (
		<div className={cx(styles.root, className)}>
			<MessagesSection
				view={view}
				messages={data.formattedInput}
				messageType={MessageType.Input}
				testId="span-messages-input"
				canLinkToToolCall={canLinkToToolCall}
				onToolLinkClick={onToolLinkClick}
			/>
			<MessagesSection
				view={view}
				messages={data.formattedOutput}
				messageType={MessageType.Output}
				testId="span-messages-output"
				canLinkToToolCall={canLinkToToolCall}
				onToolLinkClick={onToolLinkClick}
			/>
		</div>
	);
}

SpanMessages.defaultProps = {
	className: undefined,
};

export default SpanMessages;
