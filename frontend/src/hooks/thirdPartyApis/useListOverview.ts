import listOverview from 'api/thirdPartyApis/listOverview';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import {
	PayloadProps,
	Props as ListOverviewProps,
} from 'types/api/thirdPartyApis/listOverview';

export const useListOverview = (
	props: ListOverviewProps,
): UseQueryResult<SuccessResponseV2<PayloadProps>, APIError> => {
	const { start, end, show_ip: showIp, filter } = props;
	return useQuery<SuccessResponseV2<PayloadProps>, APIError>({
		queryKey: [
			REACT_QUERY_KEY.GET_DOMAINS_LIST,
			start,
			end,
			showIp,
			filter.expression,
		],
		queryFn: () =>
			listOverview({
				start,
				end,
				show_ip: showIp,
				filter,
			}),
	});
};
