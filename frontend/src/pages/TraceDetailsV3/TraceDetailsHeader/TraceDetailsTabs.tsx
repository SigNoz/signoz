import { ToggleGroup } from '@signozhq/ui/toggle-group';

import { TraceDetailsTab } from '../constants';
import { useTraceDetailsTab } from '../hooks/useTraceDetailsTab';

import styles from './TraceDetailsHeader.module.scss';

const TAB_ITEMS = [
	{
		value: TraceDetailsTab.Overview,
		label: 'Overview',
		testId: 'trace-details-tab-overview',
	},
	{
		value: TraceDetailsTab.Thread,
		label: 'Thread',
		testId: 'trace-details-tab-thread',
	},
];

function TraceDetailsTabs(): JSX.Element {
	const [tab, setTab] = useTraceDetailsTab();

	const handleChange = (value: string): void => {
		// Pushed so the thread's "Go back" returns to the previous tab, not the previous page.
		void setTab(value as TraceDetailsTab, { history: 'push' });
	};

	return (
		<div className={styles.tabs}>
			<ToggleGroup
				variant="outlined"
				color="secondary"
				type="single"
				value={tab}
				onChange={handleChange}
				size="sm"
				items={TAB_ITEMS}
			/>
		</div>
	);
}

export default TraceDetailsTabs;
