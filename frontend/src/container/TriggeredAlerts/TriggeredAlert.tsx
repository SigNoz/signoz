import { useState } from 'react';
import { Alerts } from 'types/api/alerts/getTriggered';

import Filter, { Value } from './Filter';
import FilteredTable from './FilteredTable';
import NoFilterTable from './NoFilterTable';
import { NoTableContainer } from './styles';

function TriggeredAlerts({ allAlerts }: TriggeredAlertsProps): JSX.Element {
	const [selectedGroup, setSelectedGroup] = useState<Value[]>([]);
	const [selectedFilter, setSelectedFilter] = useState<Value[]>([]);

	return (
		<div>
			<Filter
				allAlerts={allAlerts}
				selectedFilter={selectedFilter}
				selectedGroup={selectedGroup}
				setSelectedFilter={setSelectedFilter}
				setSelectedGroup={setSelectedGroup}
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
}

export default TriggeredAlerts;
