import { useMemo, useRef } from 'react';
import { ArrowDownRight, ArrowUpRight } from '@signozhq/icons';

import { useToolCallLinks } from '../../AIThreadMessage/useToolCallLinks';
import { getSpanMessages, hasAnyMessages } from '../../SpanMessages/utils';
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
	const toolCallIds = useMemo(() => buildToolCallIndex([span]), [span]);
	const { isToolLinkEnabled, onToolLinkClick } = useToolCallLinks(
		rootRef,
		toolCallIds,
	);

	if (!hasAnyMessages(data)) {
		return null;
	}

	const callbacks = { isToolLinkEnabled, onToolLinkClick };

	return (
		<div className={styles.root} ref={rootRef} data-testid="span-ai-messages">
			<MessagesAccordion
				icon={<ArrowUpRight size={14} />}
				title="Input"
				messages={data.formattedInput}
				raw={data.rawInput}
				testId="span-ai-messages-input"
				{...callbacks}
			/>
			<MessagesAccordion
				icon={<ArrowDownRight size={14} />}
				title="Output"
				messages={data.formattedOutput}
				raw={data.rawOutput}
				isOutput
				testId="span-ai-messages-output"
				{...callbacks}
			/>
		</div>
	);
}

export default SpanAIMessages;
