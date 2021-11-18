import React, { useState } from 'react';
import { Alerts } from 'types/api/alerts/getAll';
import { Group } from 'types/api/alerts/getGroups';

import { Value } from './Filter';
import Filter from './Filter';
import FilteredTable from './FilteredTable';
import NoFilterTable from './NoFilterTable';
import { NoTableContainer } from './styles';

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
				<>
					{selectedFilter.length !== 0 && selectedGroup.length === 0 ? (
						<NoTableContainer>
							<NoFilterTable allAlerts={selectedAllAlerts} />
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
				</>
			)}
		</div>
	);
};

interface TriggeredAlertsProps {
	allAlerts: Group;
}

export default TriggeredAlerts;
