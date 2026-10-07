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
const BOTTOM_DOCK_DEFAULT = 360;
const BOTTOM_DOCK_MIN = 200;

interface ThreadSpanDetailsProps {
	panelState: DetailsPanelState;
	span: ThreadSpan;
	variant: SpanDetailVariant;
	onVariantChange: (variant: SpanDetailVariant) => void;
}

function ThreadSpanDetails({
	panelState,
	span,
	variant,
	onVariantChange,
}: ThreadSpanDetailsProps): JSX.Element {
	const { id: traceId = '' } = useParams<TraceDetailV3URLProps>();
	const { data: summary } = useTraceSummary(traceId);
	const [width, setWidth] = useState(RIGHT_DOCK_MIN);
	const [height, setHeight] = useState(BOTTOM_DOCK_DEFAULT);

	const panel = (
		<SpanDetailsPanel
			panelState={panelState}
			selectedSpan={span}
			variant={variant}
			onVariantChange={onVariantChange}
			traceStartTime={summary?.startTimestampMillis}
			traceEndTime={summary?.endTimestampMillis}
		/>
	);

	if (variant === SpanDetailVariant.DOCKED_RIGHT) {
		return (
			<ResizableBox
				handle="left"
				defaultWidth={width}
				minWidth={RIGHT_DOCK_MIN}
				maxWidth={RIGHT_DOCK_MAX}
				onResize={setWidth}
				className={styles.rightDock}
			>
				{panel}
			</ResizableBox>
		);
	}

	if (variant === SpanDetailVariant.DOCKED) {
		return (
			<ResizableBox
				handle="top"
				defaultHeight={height}
				minHeight={BOTTOM_DOCK_MIN}
				onResize={setHeight}
				className={styles.bottomDock}
			>
				{panel}
			</ResizableBox>
		);
	}

	return panel;
}

export default ThreadSpanDetails;
