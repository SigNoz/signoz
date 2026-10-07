import { useMemo } from 'react';
import cx from 'classnames';

import { AIThreadMessageProps } from '../AIThreadMessage/AIThreadMessage';
import { ThreadSpan, ThreadView } from '../TraceDetailsThread/types';
import MessagesSection from './MessagesSection';
import { getSpanMessages, hasAnyMessages } from './utils';

import styles from './SpanMessages.module.scss';

interface SpanMessagesProps extends Pick<
	AIThreadMessageProps,
	'isToolLinkEnabled' | 'onToolLinkClick'
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
	isToolLinkEnabled,
	onToolLinkClick,
}: SpanMessagesProps): JSX.Element {
	const data = useMemo(() => getSpanMessages(span), [span]);
	const isFormatted = view === ThreadView.Formatted;
	const callbacks = { isToolLinkEnabled, onToolLinkClick };

	if (!hasAnyMessages(data)) {
		return (
			<div className={styles.missing}>
				This span has no input or output messages.
			</div>
		);
	}

	return (
		<div className={cx(styles.root, className)}>
			<MessagesSection
				title={isFormatted ? undefined : 'Input'}
				view={view}
				messages={data.formattedInput}
				raw={data.rawInput}
				testId="span-messages-input"
				{...callbacks}
			/>
			<MessagesSection
				title={isFormatted ? undefined : 'Output'}
				view={view}
				messages={data.formattedOutput}
				raw={data.rawOutput}
				isOutput
				testId="span-messages-output"
				{...callbacks}
			/>
		</div>
	);
}

SpanMessages.defaultProps = {
	className: undefined,
};

export default SpanMessages;
