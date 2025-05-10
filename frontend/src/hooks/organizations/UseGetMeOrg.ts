import getMeOrg from 'api/organizations/get';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { OrganizationResponse } from 'types/api/organizations/get';

const useGetMeOrg = (isLoggedIn: boolean): UseGetMeOrg =>
	useQuery({
		queryFn: () => getMeOrg(),
		queryKey: ['getMeOrg'],
		enabled: !!isLoggedIn,
	});

type UseGetMeOrg = UseQueryResult<
	SuccessResponseV2<OrganizationResponse>,
	APIError
>;

export default useGetMeOrg;
