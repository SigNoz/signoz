import getTriggeredApi from 'api/alerts/getTriggered';
import useInterval from 'hooks/useInterval';
import { useState } from 'react';
import { Alerts } from 'types/api/alerts/getTriggered';

import Filter, { Value } from './Filter';
import FilteredTable from './FilteredTable';
import NoFilterTable from './NoFilterTable';
import { NoTableContainer } from './styles';

function TriggeredAlerts({ allAlerts }: TriggeredAlertsProps): JSX.Element {
	const [allInitialAlerts, setInitialAlerts] = useState(allAlerts || []);

	useInterval(() => {
		(async (): Promise<void> => {
			const response = await getTriggeredApi({
				active: true,
				inhibited: true,
				silenced: false,
			});

			if (response.statusCode === 200 && response.payload !== null) {
				// commented reduce() call as we no longer use /alerts/groups
				// from alertmanager which needed re-grouping on client side
				// const initialAlerts: Alerts[] = [];

				// const allAlerts: Alerts[] = response.payload.reduce((acc, cur) => {
				//	return [...acc, ...cur.alerts];
				// }, initialAlerts);

				setInitialAlerts(response.payload);
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
				<div>
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
				</div>
			)}
		</div>
	);
}

interface TriggeredAlertsProps {
	allAlerts: Alerts[];
}

export default TriggeredAlerts;
