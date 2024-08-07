import './tabsAndFilters.styles.scss';

import { Filters } from './Filters/Filters';
import { Tabs } from './Tabs/Tabs';

function TabsAndFilters(): JSX.Element {
	// TODO(shaheer): make it a reusable component inside periscope
	return (
		<div className="tabs-and-filters">
			<Tabs />
			<Filters />
		</div>
	);
}

export default TabsAndFilters;
