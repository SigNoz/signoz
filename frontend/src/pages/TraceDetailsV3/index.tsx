import { TraceDetailsTab } from './constants';
import { useTraceDetailsTab } from './hooks/useTraceDetailsTab';
import TraceDetailsOverview from './TraceDetailsOverview/TraceDetailsOverview';
import TraceDetailsThread from './TraceDetailsThread/TraceDetailsThread';

function TraceDetailsV3(): JSX.Element {
	const [tab] = useTraceDetailsTab();

	return tab === TraceDetailsTab.Thread ? (
		<TraceDetailsThread />
	) : (
		<TraceDetailsOverview />
	);
}

export default TraceDetailsV3;
