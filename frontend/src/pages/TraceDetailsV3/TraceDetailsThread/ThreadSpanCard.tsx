import { memo } from 'react';
import cx from 'classnames';

import SpanMessages from '../SpanMessages/SpanMessages';
import { ThreadSpan, ThreadView } from './types';

import styles from './ThreadSpanCard.module.scss';

interface ThreadSpanCardProps {
	span: ThreadSpan;
	view: ThreadView;
	isSelected: boolean;
	onSelect: (span: ThreadSpan) => void;
	isToolLinkEnabled: (toolCallId: string) => boolean;
	onToolLinkClick: (toolCallId: string) => void;
}

function ThreadSpanCard({
	span,
	view,
	isSelected,
	onSelect,
	isToolLinkEnabled,
	onToolLinkClick,
}: ThreadSpanCardProps): JSX.Element {
	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
		<article
			className={cx(styles.card, isSelected && styles.isSelected)}
			onClick={(): void => onSelect(span)}
			data-span-id={span.span_id}
			data-testid="thread-span-card"
		>
			<SpanMessages
				span={span}
				view={view}
				isToolLinkEnabled={isToolLinkEnabled}
				onToolLinkClick={onToolLinkClick}
			/>
		</article>
	);
}

export default memo(ThreadSpanCard);
