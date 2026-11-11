import { ToggleGroup } from '@signozhq/ui/toggle-group';
import { useAppParams } from 'lib/router/useAppParams';

import { TraceDetailsTab } from '../constants';
import { TraceDetailEventKeys, TraceDetailEvents } from '../events';
import { useTraceDetailLogEvent } from '../hooks/useTraceDetailLogEvent';
import { useTraceDetailsTab } from '../hooks/useTraceDetailsTab';

import styles from './TraceDetailsHeader.module.scss';

interface TraceDetailsTabsProps {
	hasAiSummary: boolean;
}

function TraceDetailsTabs({
	hasAiSummary,
}: TraceDetailsTabsProps): JSX.Element {
	const { id: traceId = '' } = useAppParams<'id'>();
	const [tab, setTab] = useTraceDetailsTab();
	const logTraceEvent = useTraceDetailLogEvent('v3', traceId);

	const handleChange = (value: string): void => {
		logTraceEvent(TraceDetailEvents.DetailsTabChanged, {
			[TraceDetailEventKeys.From]: tab,
			[TraceDetailEventKeys.To]: value,
		});
		// Pushed so the thread's "Go back" returns to the previous tab, not the previous page.
		void setTab(value as TraceDetailsTab, { history: 'push' });
	};

	const items = [
		{
			value: TraceDetailsTab.Overview,
			label: 'Overview',
			testId: 'trace-details-tab-overview',
		},
		{
			value: TraceDetailsTab.Thread,
			label: 'Thread',
			testId: 'trace-details-tab-thread',
			suffix: hasAiSummary ? (
				<span
					className={styles.aiDot}
					aria-hidden
					data-testid="trace-details-tab-thread-ai-dot"
				/>
			) : undefined,
		},
	];

	return (
		<div className={styles.tabs}>
			<ToggleGroup
				variant="outlined"
				color="secondary"
				type="single"
				value={tab}
				onChange={handleChange}
				size="sm"
				items={items}
			/>
		</div>
	);
}

export default TraceDetailsTabs;
