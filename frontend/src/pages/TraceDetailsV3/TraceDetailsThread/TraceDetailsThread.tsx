import { useParams } from 'react-router-dom';
import { Callout } from '@signozhq/ui/callout';
import history, { hasInAppHistory } from 'lib/history';
import { TraceDetailV3URLProps } from 'types/api/trace/getTraceV3';

import { TraceDetailsTab } from '../constants';
import { useSpanDetailVariant } from '../hooks/useSpanDetailVariant';
import { useTraceDetailsTab } from '../hooks/useTraceDetailsTab';
import { SpanDetailVariant } from '../SpanDetailsPanel/constants';
import { useThreadSpanSelection } from './hooks/useThreadSpanSelection';
import { useThreadView } from './hooks/useThreadView';
import { useTraceThread } from './hooks/useTraceThread';
import ThreadNoAiSpans from './ThreadNoAiSpans';
import ThreadPageLoader from './ThreadPageLoader';
import ThreadSpanCard from './ThreadSpanCard';
import ThreadSpanDetails from './ThreadSpanDetails';
import ThreadSpanList from './ThreadSpanList';
import ThreadSpanNotFound from './ThreadSpanNotFound';
import ThreadViewToggle from './ThreadViewToggle';
import { InterestedSpanStatus } from './types';
import { getInterestedSpanStatus } from './utils';

import styles from './TraceDetailsThread.module.scss';

const INITIAL_LOADER_COUNT = 4;

function TraceDetailsThread(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailV3URLProps>();
	const [, setTab] = useTraceDetailsTab();
	const [view, setView] = useThreadView();
	const {
		interestedSpanId,
		clearInterestedSpan,
		selectedSpanId,
		selectSpan,
		panelState,
	} = useThreadSpanSelection();
	const {
		spans,
		spansAboveFirstPage,
		isLoading,
		isError,
		hasNextPage,
		hasPreviousPage,
		isFetchingNextPage,
		isFetchingPreviousPage,
		fetchNextPage,
		fetchPreviousPage,
	} = useTraceThread({ traceId: traceId || '', interestedSpanId });

	const interestedSpanStatus = getInterestedSpanStatus(
		interestedSpanId,
		spans,
		isLoading,
	);
	const interestedSpanIndex = spans.findIndex(
		(span) => span.span_id === interestedSpanId,
	);

	const selectedSpan = spans.find((span) => span.span_id === selectedSpanId);
	const [spanDetailVariant, setSpanDetailVariant] = useSpanDetailVariant();
	const isBottomDocked = spanDetailVariant === SpanDetailVariant.DOCKED;

	const spanDetails = panelState.isOpen && selectedSpan && (
		<ThreadSpanDetails
			panelState={panelState}
			span={selectedSpan}
			variant={spanDetailVariant}
			onVariantChange={setSpanDetailVariant}
		/>
	);
	const hasNoThread =
		!isLoading &&
		interestedSpanStatus !== InterestedSpanStatus.NotFound &&
		(isError || spans.length === 0);

	const renderBody = (): JSX.Element => {
		if (isLoading) {
			return (
				<div className={styles.initialLoader} data-testid="thread-loading">
					{Array.from({ length: INITIAL_LOADER_COUNT }).map((_, i) => (
						// eslint-disable-next-line react/no-array-index-key
						<ThreadPageLoader key={i} testId="thread-loading-item" />
					))}
				</div>
			);
		}
		if (interestedSpanStatus === InterestedSpanStatus.NotFound) {
			return (
				<ThreadSpanNotFound
					onGoBack={(): void => {
						// go back to the previous page
						if (hasInAppHistory()) {
							history.goBack();
						} else {
							void setTab(TraceDetailsTab.Overview);
						}
					}}
					onShowThread={clearInterestedSpan}
				/>
			);
		}
		if (hasNoThread) {
			return <ThreadNoAiSpans />;
		}
		return (
			<>
				{interestedSpanStatus === InterestedSpanStatus.NoIOMessages && (
					<Callout
						type="info"
						size="small"
						className={styles.notice}
						title="The requested span has no input or output messages. Showing the rest of the thread."
						testId="thread-anchor-no-messages"
					/>
				)}
				<ThreadSpanList
					key={interestedSpanId}
					spans={spans}
					spansAboveFirstPage={spansAboveFirstPage}
					initialSpanIndex={
						interestedSpanIndex === -1 ? undefined : interestedSpanIndex
					}
					hasNextPage={hasNextPage}
					hasPreviousPage={hasPreviousPage}
					isFetchingNextPage={isFetchingNextPage}
					isFetchingPreviousPage={isFetchingPreviousPage}
					fetchNextPage={fetchNextPage}
					fetchPreviousPage={fetchPreviousPage}
					renderSpan={(span): JSX.Element => (
						<ThreadSpanCard
							span={span}
							view={view}
							isSelected={span.span_id === selectedSpanId}
							onSelect={selectSpan}
						/>
					)}
				/>
			</>
		);
	};

	return (
		<div className={styles.root} data-testid="trace-details-thread">
			<div className={styles.content}>
				{!hasNoThread && interestedSpanStatus !== InterestedSpanStatus.NotFound && (
					<div className={styles.toolbar}>
						<ThreadViewToggle
							value={view}
							onChange={(next): void => {
								void setView(next);
							}}
						/>
						{spans.length > 0 && <span>Showing {spans.length} spans</span>}
					</div>
				)}
				{renderBody()}
				{isBottomDocked && spanDetails}
			</div>
			{!isBottomDocked && spanDetails}
		</div>
	);
}

export default TraceDetailsThread;
