import { ToggleGroup, ToggleGroupItem } from '@signozhq/ui/toggle-group';

import { TraceDetailsTab } from '../constants';
import { useTraceDetailsTab } from '../hooks/useTraceDetailsTab';

import styles from './TraceDetailsHeader.module.scss';

function TraceDetailsTabs(): JSX.Element {
	const [tab, setTab] = useTraceDetailsTab();

	const handleChange = (value: string): void => {
		// Clicking the active item deselects it and reports ''.
		if (value) {
			void setTab(value as TraceDetailsTab);
		}
	};

	return (
		<ToggleGroup
			type="single"
			value={tab}
			onChange={handleChange}
			className={styles.tabs}
			size="sm"
		>
			<ToggleGroupItem
				value={TraceDetailsTab.Overview}
				className={styles.tab}
				data-testid="trace-details-tab-overview"
			>
				Overview
			</ToggleGroupItem>
			<ToggleGroupItem
				value={TraceDetailsTab.Thread}
				className={styles.tab}
				data-testid="trace-details-tab-thread"
			>
				Thread
			</ToggleGroupItem>
		</ToggleGroup>
	);
}

export default TraceDetailsTabs;
