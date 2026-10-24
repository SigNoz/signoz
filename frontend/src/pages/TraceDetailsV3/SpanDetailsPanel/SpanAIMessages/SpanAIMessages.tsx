import { useMemo, useRef } from 'react';
import { ArrowDownRight, ArrowUpRight } from '@signozhq/icons';

import { MessageType } from '../../AIThreadMessage/types';
import { useToolCallLinks } from '../../AIThreadMessage/useToolCallLinks';
import { getSpanMessages, hasAnyMessages } from '../../utils/spanMessages';
import { ThreadSpan } from '../../TraceDetailsThread/types';
import { buildToolCallIndex } from '../../TraceDetailsThread/utils';
import MessagesAccordion from './MessagesAccordion';

import styles from './SpanAIMessages.module.scss';

interface SpanAIMessagesProps {
	span: ThreadSpan;
}

/** Waterfall spans only carry raw attributes, so they get the JSON view alone. */
function SpanAIMessages({ span }: SpanAIMessagesProps): JSX.Element | null {
	const data = useMemo(() => getSpanMessages(span), [span]);

	const rootRef = useRef<HTMLDivElement>(null);
	const toolCallKeys = useMemo(() => buildToolCallIndex(span), [span]);
	const { canLinkToToolCall, onToolLinkClick } = useToolCallLinks(
		rootRef,
		toolCallKeys,
	);

	if (!hasAnyMessages(data)) {
		return null;
	}

	return (
		<div className={styles.root} ref={rootRef} data-testid="span-ai-messages">
			<MessagesAccordion
				icon={<ArrowUpRight size={14} />}
				title="Input"
				messages={data.formattedInput}
				raw={data.rawInput}
				messageType={MessageType.Input}
				testId="span-ai-messages-input"
				canLinkToToolCall={canLinkToToolCall}
				onToolLinkClick={onToolLinkClick}
			/>
			<MessagesAccordion
				icon={<ArrowDownRight size={14} />}
				title="Output"
				messages={data.formattedOutput}
				raw={data.rawOutput}
				messageType={MessageType.Output}
				testId="span-ai-messages-output"
				canLinkToToolCall={canLinkToToolCall}
				onToolLinkClick={onToolLinkClick}
			/>
		</div>
	);
}

export default SpanAIMessages;
