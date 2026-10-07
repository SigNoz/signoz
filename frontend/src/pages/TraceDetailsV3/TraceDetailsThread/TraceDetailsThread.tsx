import { useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Callout } from '@signozhq/ui/callout';
import { MessagesSquare } from '@signozhq/icons';
import { TraceDetailV3URLProps } from 'types/api/trace/getTraceV3';

import { useToolCallLinks } from '../AIThreadMessage/useToolCallLinks';
import { TraceDetailsTab } from '../constants';
import { useTraceDetailsTab } from '../hooks/useTraceDetailsTab';
import { useScrollToAnchorSpan } from './hooks/useScrollToAnchorSpan';
import { useThreadSpanSelection } from './hooks/useThreadSpanSelection';
import { useThreadView } from './hooks/useThreadView';
import { useTraceThread } from './hooks/useTraceThread';
import ThreadEmptyState from './ThreadEmptyState';
import ThreadPageLoader from './ThreadPageLoader';
import ThreadSpanCard from './ThreadSpanCard';
import ThreadSpanDetails from './ThreadSpanDetails';
import ThreadSpanList from './ThreadSpanList';
import ThreadSpanNotFound from './ThreadSpanNotFound';
import ThreadViewToggle from './ThreadViewToggle';
import { AnchorStatus } from './types';
import { buildToolCallIndex, getAnchorStatus } from './utils';

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

	const listRef = useRef<HTMLDivElement>(null);
	const toolCallIds = useMemo(() => buildToolCallIndex(spans), [spans]);
	const { isToolLinkEnabled, onToolLinkClick } = useToolCallLinks(
		listRef,
		toolCallIds,
	);

	const anchorStatus = getAnchorStatus(anchorSpanId, spans, isLoading);
	useScrollToAnchorSpan(
		listRef,
		anchorSpanId,
		anchorStatus === AnchorStatus.Found,
	);

	const selectedSpan = spans.find((span) => span.span_id === selectedSpanId);

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
		if (isError || spans.length === 0) {
			return (
				<ThreadEmptyState
					icon={<MessagesSquare size={32} />}
					title="No AI thread for this trace"
					description="Threads show the input and output messages of LLM spans. This trace has none."
					testId="thread-empty"
				/>
			);
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
					listRef={listRef}
					firstItemKey={spans[0]?.span_id}
					hasNextPage={thread.hasNextPage}
					hasPreviousPage={thread.hasPreviousPage}
					isFetchingNextPage={thread.isFetchingNextPage}
					isFetchingPreviousPage={thread.isFetchingPreviousPage}
					fetchNextPage={thread.fetchNextPage}
					fetchPreviousPage={thread.fetchPreviousPage}
				>
					{spans.map((span) => (
						<ThreadSpanCard
							key={span.span_id}
							span={span}
							view={view}
							isSelected={span.span_id === selectedSpanId}
							onSelect={selectSpan}
							isToolLinkEnabled={isToolLinkEnabled}
							onToolLinkClick={onToolLinkClick}
						/>
					))}
				</ThreadSpanList>
			</>
		);
	};

	return (
		<div className={styles.root} data-testid="trace-details-thread">
			<div className={styles.content}>
				<div className={styles.toolbar}>
					<ThreadViewToggle
						value={view}
						onChange={(next): void => {
							void setView(next);
						}}
					/>
					{spans.length > 0 && <span>Showing {spans.length} spans</span>}
				</div>
				{renderBody()}
			</div>
			{panelState.isOpen && selectedSpan && (
				<ThreadSpanDetails panelState={panelState} span={selectedSpan} />
			)}
		</div>
	);
}

export default TraceDetailsThread;
