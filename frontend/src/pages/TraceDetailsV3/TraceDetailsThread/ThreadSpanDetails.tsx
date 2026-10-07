import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DetailsPanelState } from 'components/DetailsPanel/types';
import { ResizableBox } from 'periscope/components/ResizableBox';
import { TraceDetailV3URLProps } from 'types/api/trace/getTraceV3';

import SpanDetailsPanel from '../SpanDetailsPanel/SpanDetailsPanel';
import { SpanDetailVariant } from '../SpanDetailsPanel/constants';
import { useTraceSummary } from '../TraceDetailsHeader/useTraceSummary';
import { ThreadSpan } from './types';

import styles from './TraceDetailsThread.module.scss';

const RIGHT_DOCK_MIN = 480;
const RIGHT_DOCK_MAX = 720;

interface ThreadSpanDetailsProps {
	panelState: DetailsPanelState;
	span: ThreadSpan;
}

function ThreadSpanDetails({
	panelState,
	span,
}: ThreadSpanDetailsProps): JSX.Element {
	const { id: traceId = '' } = useParams<TraceDetailV3URLProps>();
	const { data: summary } = useTraceSummary(traceId);
	const [width, setWidth] = useState(RIGHT_DOCK_MIN);

	return (
		<ResizableBox
			handle="left"
			defaultWidth={width}
			minWidth={RIGHT_DOCK_MIN}
			maxWidth={RIGHT_DOCK_MAX}
			onResize={setWidth}
			className={styles.rightDock}
		>
			<SpanDetailsPanel
				panelState={panelState}
				selectedSpan={span}
				variant={SpanDetailVariant.DOCKED_RIGHT}
				traceStartTime={summary?.startTimestampMillis}
				traceEndTime={summary?.endTimestampMillis}
			/>
		</ResizableBox>
	);
}

export default ThreadSpanDetails;
