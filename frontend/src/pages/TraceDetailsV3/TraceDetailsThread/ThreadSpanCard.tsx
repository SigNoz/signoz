import { KeyboardEvent, memo, useMemo, useRef } from 'react';
import cx from 'classnames';

import { useToolCallLinks } from '../AIThreadMessage/useToolCallLinks';
import SpanMessages from '../SpanMessages/SpanMessages';
import { ThreadSpan, ThreadView } from './types';
import { buildToolCallIndex } from './utils';

import styles from './ThreadSpanCard.module.scss';

interface ThreadSpanCardProps {
	span: ThreadSpan;
	view: ThreadView;
	isSelected: boolean;
	onSelect: (span: ThreadSpan) => void;
}

function ThreadSpanCard({
	span,
	view,
	isSelected,
	onSelect,
}: ThreadSpanCardProps): JSX.Element {
	const cardRef = useRef<HTMLDivElement>(null);
	// A result links only to a call in its own span.
	const toolCallKeys = useMemo(() => buildToolCallIndex(span), [span]);
	const { canLinkToToolCall, onToolLinkClick } = useToolCallLinks(
		cardRef,
		toolCallKeys,
	);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
		// Keys pressed on the card's own controls stay with them.
		if (event.target !== event.currentTarget) {
			return;
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onSelect(span);
		}
	};

	return (
		<div
			ref={cardRef}
			// eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <button> can't nest the card's own buttons
			role="button"
			tabIndex={0}
			aria-pressed={isSelected}
			aria-label={`Span ${span.name}`}
			className={cx(styles.card, isSelected && styles.isSelected)}
			onClick={(): void => onSelect(span)}
			onKeyDown={handleKeyDown}
			data-span-id={span.span_id}
			data-testid="thread-span-card"
		>
			<SpanMessages
				span={span}
				view={view}
				canLinkToToolCall={canLinkToToolCall}
				onToolLinkClick={onToolLinkClick}
			/>
		</div>
	);
}

export default memo(ThreadSpanCard);
