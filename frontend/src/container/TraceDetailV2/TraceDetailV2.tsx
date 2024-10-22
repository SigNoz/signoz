import './TraceDetailsV2.styles.scss';

import { Typography } from 'antd';
import { Virtuoso } from 'react-virtuoso';
import { SpanItem } from 'types/api/trace/getTraceDetails';

interface ITraceDetailV2Props {
	spans: SpanItem[];
	isLoadingTraceDetails: boolean;
	setSpanID: React.Dispatch<React.SetStateAction<string>>;
	setUncollapsedNodes: React.Dispatch<React.SetStateAction<string[]>>;
}

function getSpanItemRenderer(index: number, data: SpanItem): JSX.Element {
	return (
		<div key={index} className="span-container">
			<section className="span-container-details-section">
				<Typography.Text>{data.name}</Typography.Text>
				<Typography.Text>{data.serviceName}</Typography.Text>
			</section>
			<section className="span-container-duration-section">
				<Typography.Text>{data.durationNano}</Typography.Text>
			</section>
		</div>
	);
}

/**
 * 1. handle the loading gracefully here
 * 2. handle the logic to render the spans based on their level and coloring based on service name
 */
function TraceDetailV2(props: ITraceDetailV2Props): JSX.Element {
	const { spans, setUncollapsedNodes, setSpanID, isLoadingTraceDetails } = props;
	console.log({ spans, setUncollapsedNodes, setSpanID, isLoadingTraceDetails });
	return (
		<div className="trace-details-v2-container">
			<Virtuoso
				data={spans}
				itemContent={getSpanItemRenderer}
				className="trace-details-v2-span-area"
			/>
		</div>
	);
}

export default TraceDetailV2;
