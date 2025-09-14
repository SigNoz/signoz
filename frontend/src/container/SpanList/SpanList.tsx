import './SpanList.styles.scss';

import { useMemo } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import { mockEntrySpanData } from './mockData';
import SearchFilters from './SearchFilters';
import SpanTable from './SpanTable';
import { transformEntrySpansToHierarchy } from './utils';

interface SpanListProps {
	traceId?: string;
	setSelectedSpan?: (span: Span) => void;
}

function SpanList({ traceId, setSelectedSpan }: SpanListProps): JSX.Element {
	const hierarchicalData = useMemo(
		() => transformEntrySpansToHierarchy(mockEntrySpanData),
		[],
	);

	return (
		<div className="span-list">
			<div className="span-list__header">
				<SearchFilters />
			</div>
			<div className="span-list__content">
				<SpanTable
					data={hierarchicalData}
					traceId={traceId}
					setSelectedSpan={setSelectedSpan}
				/>
			</div>
		</div>
	);
}

SpanList.defaultProps = {
	traceId: undefined,
	setSelectedSpan: (): void => {},
};

export default SpanList;
