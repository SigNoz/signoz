import { Typography } from 'antd';
import getTraceDetails from 'api/trace/getTraceDetails';
import { cloneDeep } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import { Props as TraceDetailProps } from 'types/api/trace/getTraceItem';

const FRONTEND_SPANS_LIMIT = 900;

function renderSpans(span: any): JSX.Element {
	return (
		<div
			style={{
				padding: '0.5rem',
				height: `20px`,
				display: 'flex',
				gap: '10px',
			}}
		>
			<Typography.Text>{span.name}</Typography.Text>
			<Typography.Text>{span.serviceName}</Typography.Text>
		</div>
	);
}

function TraceDetailsV2(): JSX.Element {
	const { id } = useParams<TraceDetailProps>();
	const [spans, setSpans] = useState<any[]>([]);
	const [interestedSpanId, setInterestedSpanId] = useState<string>('');
	const [uncollapsedNodes] = useState<string[]>(['be8a74f5d02c79ac']);

	const { data: spansData, isLoading: isLoadingTraceDetails } = useQuery({
		queryFn: () =>
			getTraceDetails({ traceId: id, interestedSpanId, uncollapsedNodes }),
		queryKey: [interestedSpanId],
	});

	const onEndReached = (index: number): void => {
		setInterestedSpanId(spans[index].spanId);
	};

	console.log(spans.length, spansData?.payload);

	useEffect(() => {
		const newSpans = ((spansData?.payload as unknown) as any[]) || [];

		setSpans((prev) => {
			const oldSpans = cloneDeep(prev);
			if (newSpans.length + oldSpans.length > FRONTEND_SPANS_LIMIT) {
				return [...oldSpans, ...newSpans].slice(
					newSpans.length + oldSpans.length - FRONTEND_SPANS_LIMIT,
				);
			}
			return [...oldSpans, ...newSpans];
		});
	}, [spansData?.payload]);

	return (
		<div>
			Trace Details V2
			{isLoadingTraceDetails && <div>Loading....</div>}
			<Virtuoso
				style={{ height: 600 }}
				data={spans}
				itemContent={(_, span): JSX.Element => renderSpans(span)}
				endReached={onEndReached}
			/>
		</div>
	);
}

export default TraceDetailsV2;
