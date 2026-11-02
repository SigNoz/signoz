import { useState } from 'react';
import { DetailsPanelState } from 'components/DetailsPanel/types';
import { useAppParams } from 'lib/router/useAppParams';
import { ResizableBox } from 'periscope/components/ResizableBox';

import SpanDetailsPanel from '../SpanDetailsPanel/SpanDetailsPanel';
import {
	SPAN_DETAILS_PANEL_MIN_WIDTH,
	SpanDetailVariant,
} from '../SpanDetailsPanel/constants';
import { useTraceSummary } from '../TraceDetailsHeader/useTraceSummary';
import { ThreadSpan } from './types';

import styles from './TraceDetailsThread.module.scss';

const RIGHT_DOCK_MIN = SPAN_DETAILS_PANEL_MIN_WIDTH;
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
	const [width, setWidth] = useState(RIGHT_DOCK_MIN);
	const [height, setHeight] = useState(BOTTOM_DOCK_DEFAULT);
	const { id: traceId = '' } = useAppParams<'id'>();
	const { data: traceSummary } = useTraceSummary(traceId);

	const panel = (
		<SpanDetailsPanel
			panelState={panelState}
			selectedSpan={span}
			variant={variant}
			onVariantChange={onVariantChange}
			traceStartTime={traceSummary?.startTimestampMillis}
			traceEndTime={traceSummary?.endTimestampMillis}
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
