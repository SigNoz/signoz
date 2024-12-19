import { PlayCircleFilled } from '@ant-design/icons';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import ROUTES from 'constants/routes';
import {
	constructCompositeQuery,
	defaultLiveQueryDataConfig,
} from 'container/LiveLogs/constants';
import { QueryHistoryState } from 'container/LiveLogs/types';
import LocalTopNav from 'container/LocalTopNav';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { useHistory } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { LiveButtonStyled } from './styles';

function LogsTopNav(): JSX.Element {
	const history = useHistory();
	const queryClient = useQueryClient();

	const { stagedQuery, panelType } = useQueryBuilder();

	const handleGoLive = useCallback(() => {
		if (!stagedQuery) return;

		let queryHistoryState: QueryHistoryState | null = null;

		const compositeQuery = constructCompositeQuery({
			query: stagedQuery,
			initialQueryData: initialQueryBuilderFormValuesMap.logs,
			customQueryData: defaultLiveQueryDataConfig,
		});

		const isListView =
			panelType === PANEL_TYPES.LIST && stagedQuery.builder.queryData[0];

		if (isListView) {
			const [graphQuery, listQuery] = queryClient.getQueriesData<
				SuccessResponse<MetricRangePayloadProps> | ErrorResponse
			>({
				queryKey: REACT_QUERY_KEY.GET_QUERY_RANGE,
				active: true,
			});

			queryHistoryState = {
				graphQueryPayload:
					graphQuery && graphQuery[1]
						? graphQuery[1].payload?.data.result || []
						: [],
				listQueryPayload:
					listQuery && listQuery[1]
						? listQuery[1].payload?.data?.newResult?.data?.result || []
						: [],
			};
		}

		const JSONCompositeQuery = encodeURIComponent(JSON.stringify(compositeQuery));

		const path = `${ROUTES.LIVE_LOGS}?${QueryParams.compositeQuery}=${JSONCompositeQuery}`;

		history.push(path, queryHistoryState);
	}, [history, panelType, queryClient, stagedQuery]);

	const liveButton = useMemo(
		() => (
			<LiveButtonStyled
				icon={<PlayCircleFilled />}
				onClick={handleGoLive}
				type="primary"
				size="small"
			>
				Go Live
			</LiveButtonStyled>
		),
		[handleGoLive],
	);
	return (
		<LocalTopNav
			actions={liveButton}
			renderPermissions={{ isDateTimeEnabled: true }}
		/>
	);
}

export default LogsTopNav;
