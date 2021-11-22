import React, { useState } from 'react';
import { Group } from 'types/api/alerts/getGroups';

import { Value } from './Filter';
import Filter from './Filter';
import FilteredTable from './FilteredTable';
import NoFilterTable from './NoFilterTable';
import { NoTableContainer } from './styles';

const TriggeredAlerts = ({ allAlerts }: TriggeredAlertsProps): JSX.Element => {
	const allInitialAlerts = allAlerts?.alerts || [];

	const [selectedGroup, setSelectedGroup] = useState<Value[]>([]);
	const [selectedFilter, setSelectedFilter] = useState<Value[]>([]);

	return (
		<div>
			<Filter
				{...{
					allAlerts: allInitialAlerts,
					selectedFilter,
					selectedGroup,
					setSelectedFilter,
					setSelectedGroup,
				}}
			/>

			{selectedFilter.length === 0 && selectedGroup.length === 0 ? (
				<NoTableContainer>
					<NoFilterTable
						selectedFilter={selectedFilter}
						allAlerts={allInitialAlerts}
					/>
				</NoTableContainer>
			) : (
				<>
					{selectedFilter.length !== 0 && selectedGroup.length === 0 ? (
						<NoTableContainer>
							<NoFilterTable
								selectedFilter={selectedFilter}
								allAlerts={allInitialAlerts}
							/>
						</NoTableContainer>
					) : (
						<FilteredTable
							{...{
								allAlerts: allInitialAlerts,
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
