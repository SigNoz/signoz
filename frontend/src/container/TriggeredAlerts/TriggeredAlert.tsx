import getGroupApi from 'api/alerts/getGroup';
import useInterval from 'hooks/useInterval';
import React, { useState } from 'react';
import { Alerts } from 'types/api/alerts/getAll';

import { Value } from './Filter';
import Filter from './Filter';
import FilteredTable from './FilteredTable';
import NoFilterTable from './NoFilterTable';
import { NoTableContainer } from './styles';

const TriggeredAlerts = ({ allAlerts }: TriggeredAlertsProps): JSX.Element => {
	const [allInitialAlerts, setInitialAlerts] = useState(allAlerts || []);

	useInterval(() => {
		(async (): Promise<void> => {
			const response = await getGroupApi({
				active: true,
				inhibited: true,
				silenced: false,
			});

			if (response.statusCode === 200 && response.payload !== null) {
				const initialAlerts: Alerts[] = [];

				const allAlerts: Alerts[] = response.payload.reduce((acc, cur) => {
					return [...acc, ...cur.alerts];
				}, initialAlerts);

				setInitialAlerts(allAlerts);
			}
		})();
	}, 30000);

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
	allAlerts: Alerts[];
}

export default TriggeredAlerts;
