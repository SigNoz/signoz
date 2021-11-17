import React, { useState } from 'react';
import { Group } from 'types/api/alerts/getGroups';
import { Value } from './Filter';
import NoFilterTable from './NoFilterTable';
import Filter from './Filter';
import FilteredTable from './FilteredTable';
import { NoTableContainer } from './styles';
import { Alerts } from 'types/api/alerts/getAll';

const TriggeredAlerts = ({ allAlerts }: TriggeredAlertsProps): JSX.Element => {
	const allInitialAlerts = allAlerts?.alerts || [];
	const [selectedAllAlerts, setSelectedAllAlerts] = useState<Alerts[]>(
		allInitialAlerts,
	);

	const [selectedGroup, setSelectedGroup] = useState<Value[]>([]);
	const [selectedFilter, setSelectedFilter] = useState<Value[]>([]);

	return (
		<div>
			<Filter
				{...{
					allAlerts: selectedAllAlerts,
					selectedFilter,
					selectedGroup,
					setSelectedFilter,
					setSelectedGroup,
					setSelectedAllAlerts,
				}}
			/>
			{selectedFilter.length === 0 && selectedGroup.length === 0 ? (
				<NoTableContainer>
					<NoFilterTable allAlerts={allInitialAlerts} />
				</NoTableContainer>
			) : (
				<FilteredTable
					{...{
						allAlerts: selectedAllAlerts,
						selectedFilter,
						selectedGroup,
					}}
				/>
			)}
		</div>
	);
};

interface TriggeredAlertsProps {
	allAlerts: Group;
}

export default TriggeredAlerts;
