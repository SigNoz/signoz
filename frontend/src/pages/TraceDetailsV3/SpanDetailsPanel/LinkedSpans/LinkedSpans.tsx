import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import ROUTES from 'constants/routes';
import KeyValueLabel from 'periscope/components/KeyValueLabel';

import './LinkedSpans.styles.scss';

interface SpanReference {
	traceId: string;
	spanId: string;
	refType: string;
}

interface LinkedSpansProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	references: any;
}

interface LinkedSpansState {
	linkedSpans: SpanReference[];
	count: number;
	isOpen: boolean;
	toggleOpen: () => void;
}

export function useLinkedSpans(references: any): LinkedSpansState {
	const [isOpen, setIsOpen] = useState(false);

	const linkedSpans: SpanReference[] = useMemo(
		() =>
			(references || []).filter(
				(ref: SpanReference) => ref.refType !== 'CHILD_OF',
			),
		[references],
	);

	const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

	return {
		linkedSpans,
		count: linkedSpans.length,
		isOpen,
		toggleOpen,
	};
}

export function LinkedSpansToggle({
	count,
	isOpen,
	toggleOpen,
}: {
	count: number;
	isOpen: boolean;
	toggleOpen: () => void;
}): JSX.Element {
	if (count === 0) {
		return <span className="linked-spans__label">0 linked spans</span>;
	}

	return (
		<button type="button" className="linked-spans__toggle" onClick={toggleOpen}>
			<span className="linked-spans__label">
				{count} linked span{count !== 1 ? 's' : ''}
			</span>
			{isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
		</button>
	);
}

export function LinkedSpansPanel({
	linkedSpans,
	isOpen,
}: {
	linkedSpans: SpanReference[];
	isOpen: boolean;
}): JSX.Element | null {
	const getLink = useCallback(
		(item: SpanReference): string =>
			`${ROUTES.TRACE}/${item.traceId}?spanId=${item.spanId}`,
		[],
	);

	if (!isOpen || linkedSpans.length === 0) {
		return null;
	}

	return (
		<div className="linked-spans__list">
			{linkedSpans.map((item) => (
				<KeyValueLabel
					key={item.spanId}
					badgeKey="Linked Span ID"
					badgeValue={
						<Link to={getLink(item)}>
							<Badge color="vanilla">{item.spanId}</Badge>
						</Link>
					}
					direction="column"
				/>
			))}
		</div>
	);
}

function LinkedSpans({ references }: LinkedSpansProps): JSX.Element {
	const { linkedSpans, count, isOpen, toggleOpen } = useLinkedSpans(references);

	return (
		<div className="linked-spans">
			<LinkedSpansToggle count={count} isOpen={isOpen} toggleOpen={toggleOpen} />
			<LinkedSpansPanel linkedSpans={linkedSpans} isOpen={isOpen} />
		</div>
	);
}

export default LinkedSpans;
