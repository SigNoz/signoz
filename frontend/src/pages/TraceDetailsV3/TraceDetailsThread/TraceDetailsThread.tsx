import { useParams } from 'react-router-dom';
import { Callout } from '@signozhq/ui/callout';
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
import { AnchorStatus } from './types';
import { getAnchorStatus } from './utils';

import styles from './TraceDetailsThread.module.scss';

const INITIAL_LOADER_COUNT = 3;

function TraceDetailsThread(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailV3URLProps>();
	const [, setTab] = useTraceDetailsTab();
	const [view, setView] = useThreadView();
	const { anchorSpanId, clearAnchor, selectedSpanId, selectSpan, panelState } =
		useThreadSpanSelection();
	const thread = useTraceThread(traceId || '', anchorSpanId);
	const { spans, isLoading, isError } = thread;

	const anchorStatus = getAnchorStatus(anchorSpanId, spans, isLoading);
	const anchorIndex = spans.findIndex((span) => span.span_id === anchorSpanId);

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
		anchorStatus !== AnchorStatus.NotFound &&
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
		if (anchorStatus === AnchorStatus.NotFound) {
			return (
				<ThreadSpanNotFound
					onGoBack={(): void => {
						void setTab(TraceDetailsTab.Overview);
					}}
					onShowThread={clearAnchor}
				/>
			);
		}
		if (hasNoThread) {
			return <ThreadNoAiSpans />;
		}
		return (
			<>
				{anchorStatus === AnchorStatus.NoMessages && (
					<Callout
						type="info"
						size="small"
						className={styles.notice}
						title="The requested span has no input or output messages. Showing the rest of the thread."
						testId="thread-anchor-no-messages"
					/>
				)}
				<ThreadSpanList
					key={anchorSpanId}
					spans={spans}
					spansAboveFirstPage={thread.spansAboveFirstPage}
					initialSpanIndex={anchorIndex === -1 ? undefined : anchorIndex}
					hasNextPage={thread.hasNextPage}
					hasPreviousPage={thread.hasPreviousPage}
					isFetchingNextPage={thread.isFetchingNextPage}
					isFetchingPreviousPage={thread.isFetchingPreviousPage}
					fetchNextPage={thread.fetchNextPage}
					fetchPreviousPage={thread.fetchPreviousPage}
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
				{!hasNoThread && anchorStatus !== AnchorStatus.NotFound && (
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
