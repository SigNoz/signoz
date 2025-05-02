import { Alerts } from 'types/api/alerts/getTriggered';

import Filter, { Value } from './Filter';
import FilteredTable from './FilteredTable';
import NoFilterTable from './NoFilterTable';
import { NoTableContainer } from './styles';

function TriggeredAlerts({
	allAlerts,
	selectedFilter,
	selectedGroup,
	onSelectedFilterChange,
	onSelectedGroupChange,
}: TriggeredAlertsProps): JSX.Element {
	return (
		<div>
			<Filter
				allAlerts={allAlerts}
				selectedFilter={selectedFilter}
				selectedGroup={selectedGroup}
				onSelectedFilterChange={onSelectedFilterChange}
				onSelectedGroupChange={onSelectedGroupChange}
			/>

			{selectedFilter.length === 0 && selectedGroup.length === 0 ? (
				<NoTableContainer>
					<NoFilterTable selectedFilter={selectedFilter} allAlerts={allAlerts} />
				</NoTableContainer>
			) : (
				<div>
					{selectedFilter.length !== 0 && selectedGroup.length === 0 ? (
						<NoTableContainer>
							<NoFilterTable selectedFilter={selectedFilter} allAlerts={allAlerts} />
						</NoTableContainer>
					) : (
						<FilteredTable
							allAlerts={allAlerts}
							selectedFilter={selectedFilter}
							selectedGroup={selectedGroup}
						/>
					)}
				</div>
			)}
		</div>
	);
}

interface TriggeredAlertsProps {
	allAlerts: Alerts[];
	selectedFilter: Array<Value>;
	selectedGroup: Array<Value>;
	onSelectedFilterChange: (value: Array<Value>) => void;
	onSelectedGroupChange: (value: Array<Value>) => void;
}

export default TriggeredAlerts;
