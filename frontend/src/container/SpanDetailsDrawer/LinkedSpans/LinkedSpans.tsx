import './LinkedSpans.styles.scss';

import { Button, Tooltip, Typography } from 'antd';
import ROUTES from 'constants/routes';
import { formUrlParams } from 'container/TraceDetail/utils';
import { useCallback } from 'react';
import { Span } from 'types/api/trace/getTraceV2';

import NoData from '../NoData/NoData';

interface LinkedSpansProps {
	span: Span;
}

interface SpanReference {
	traceId: string;
	spanId: string;
	refType: string;
}

function LinkedSpans(props: LinkedSpansProps): JSX.Element {
	const { span } = props;

	const getLink = useCallback((item: SpanReference): string | null => {
		if (!item.traceId || !item.spanId) {
			return null;
		}
		return `${ROUTES.TRACE}/${item.traceId}${formUrlParams({
			spanId: item.spanId,
			levelUp: 0,
			levelDown: 0,
		})}`;
	}, []);

	// Filter out CHILD_OF references as they are parent-child relationships
	const linkedSpans =
		span.references?.filter((ref: SpanReference) => ref.refType !== 'CHILD_OF') ||
		[];

	if (linkedSpans.length === 0) {
		return (
			<div className="no-linked-spans">
				<NoData name="linked spans" />
			</div>
		);
	}

	return (
		<div className="linked-spans-container">
			{linkedSpans.map((item: SpanReference) => {
				const link = getLink(item);
				return (
					<div className="item" key={item.spanId}>
						<Typography.Text className="item-key" ellipsis>
							Linked Span ID
						</Typography.Text>
						<div className="value-wrapper">
							<Tooltip title={item.spanId}>
								{link ? (
									<Typography.Link href={link} className="item-value" ellipsis>
										{item.spanId}
									</Typography.Link>
								) : (
									<Button type="link" className="item-value" disabled>
										{item.spanId}
									</Button>
								)}
							</Tooltip>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default LinkedSpans;
