import getTriggeredApi from 'api/alerts/getTriggered';
import logEvent from 'api/common/logEvent';
import Spinner from 'components/Spinner';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import useAxiosError from 'hooks/useAxiosError';
import { isUndefined } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import { Value } from './Filter';
import TriggerComponent from './TriggeredAlert';

function TriggeredAlerts(): JSX.Element {
	const [selectedGroup, setSelectedGroup] = useState<Value[]>([]);
	const [selectedFilter, setSelectedFilter] = useState<Value[]>([]);

	const { user } = useAppContext();

	const hasLoggedEvent = useRef(false); // Track if logEvent has been called

	const handleError = useAxiosError();

	const alertsResponse = useQuery(
		[REACT_QUERY_KEY.GET_TRIGGERED_ALERTS, user.id],
		{
			queryFn: () =>
				getTriggeredApi({
					active: true,
					inhibited: true,
					silenced: false,
				}),
			refetchInterval: 30000,
			onError: handleError,
		},
	);

	const handleSelectedFilterChange = useCallback((newFilter: Value[]) => {
		setSelectedFilter(newFilter);
	}, []);

	const handleSelectedGroupChange = useCallback((newGroup: Value[]) => {
		setSelectedGroup(newGroup);
	}, []);

	useEffect(() => {
		if (!hasLoggedEvent.current && !isUndefined(alertsResponse.data?.payload)) {
			logEvent('Alert: Triggered alert list page visited', {
				number: alertsResponse.data?.payload?.length,
			});
			hasLoggedEvent.current = true;
		}
	}, [alertsResponse.data?.payload]);

	if (alertsResponse.error) {
		return (
			<TriggerComponent
				allAlerts={[]}
				selectedFilter={selectedFilter}
				selectedGroup={selectedGroup}
				onSelectedFilterChange={handleSelectedFilterChange}
				onSelectedGroupChange={handleSelectedGroupChange}
			/>
		);
	}

	if (alertsResponse.isFetching || alertsResponse?.data?.payload === undefined) {
		return <Spinner height="75vh" tip="Loading Alerts..." />;
	}

	return (
		<TriggerComponent
			allAlerts={alertsResponse?.data?.payload || []}
			selectedFilter={selectedFilter}
			selectedGroup={selectedGroup}
			onSelectedFilterChange={handleSelectedFilterChange}
			onSelectedGroupChange={handleSelectedGroupChange}
		/>
	);
}

export default TriggeredAlerts;
