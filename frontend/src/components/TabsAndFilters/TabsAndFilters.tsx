import './TabsAndFilters.styles.scss';

import { Filters } from 'components/AlertDetailsFilters/Filters';

import { Tabs } from './Tabs/Tabs';

function TabsAndFilters(): JSX.Element {
	return (
		<div className="tabs-and-filters">
			<Tabs />
			<Filters />
		</div>
	);
}

export default TabsAndFilters;
