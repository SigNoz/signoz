import { useMemo, useRef, useState } from 'react';

import { useToolCallLinks } from '../../AIThreadMessage/useToolCallLinks';
import SpanMessages from '../../SpanMessages/SpanMessages';
import {
	getSpanMessages,
	hasAnyMessages,
	hasFormattedMessages,
} from '../../SpanMessages/utils';
import { ThreadSpan, ThreadView } from '../../TraceDetailsThread/types';
import ThreadViewToggle from '../../TraceDetailsThread/ThreadViewToggle';
import { buildToolCallIndex } from '../../TraceDetailsThread/utils';

import styles from './SpanAIMessages.module.scss';

interface SpanAIMessagesProps {
	span: ThreadSpan;
}

/** Waterfall spans only carry raw attributes, so they get the JSON view alone. */
function SpanAIMessages({ span }: SpanAIMessagesProps): JSX.Element | null {
	const data = useMemo(() => getSpanMessages(span), [span]);
	const canFormat = hasFormattedMessages(data);
	const [view, setView] = useState(ThreadView.Formatted);
	const effectiveView = canFormat ? view : ThreadView.Json;

	const scrollRef = useRef<HTMLDivElement>(null);
	const toolCallIds = useMemo(() => buildToolCallIndex([span]), [span]);
	const { isToolLinkEnabled, onToolLinkClick } = useToolCallLinks(
		scrollRef,
		toolCallIds,
	);

	if (!hasAnyMessages(data)) {
		return null;
	}

	return (
		<div className={styles.root} data-testid="span-ai-messages">
			<div className={styles.header}>
				Messages
				{canFormat && (
					<ThreadViewToggle
						value={effectiveView}
						onChange={setView}
						testId="span-ai-messages-view-toggle"
					/>
				)}
			</div>
			<div className={styles.scroll} ref={scrollRef}>
				<SpanMessages
					span={span}
					view={effectiveView}
					isToolLinkEnabled={isToolLinkEnabled}
					onToolLinkClick={onToolLinkClick}
				/>
			</div>
		</div>
	);
}

export default SpanAIMessages;
