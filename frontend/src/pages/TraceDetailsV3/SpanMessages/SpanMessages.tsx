import { useMemo } from 'react';
import cx from 'classnames';

import { AIThreadMessageProps } from '../AIThreadMessage/AIThreadMessage';
import { ThreadSpan, ThreadView } from '../TraceDetailsThread/types';
import JsonBlock from '../AIThreadMessage/JsonBlock';
import MessagesSection from './MessagesSection';
import { getSpanMessages, hasAnyMessages } from './utils';

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
	const isFormatted = view === ThreadView.Formatted;

	if (!hasAnyMessages(data)) {
		return (
			//TODO: add message here
			<div className={styles.missing}></div>
		);
	}

	if (!isFormatted) {
		return (
			<div className={cx(styles.root, className)} data-testid="span-messages-json">
				<JsonBlock data={{ input: data.rawInput, output: data.rawOutput }} />
			</div>
		);
	}

	return (
		<div className={cx(styles.root, className)}>
			<MessagesSection
				view={view}
				messages={data.formattedInput}
				raw={data.rawInput}
				testId="span-messages-input"
				canLinkToToolCall={canLinkToToolCall}
				onToolLinkClick={onToolLinkClick}
			/>
			<MessagesSection
				view={view}
				messages={data.formattedOutput}
				raw={data.rawOutput}
				isOutput
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
