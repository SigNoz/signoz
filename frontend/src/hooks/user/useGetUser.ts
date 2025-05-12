import getUser from 'api/v1/user/id/get';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { UserResponse } from 'types/api/user/getUser';

const useGetUser = (userId: string, isLoggedIn: boolean): UseGetUser =>
	useQuery({
		queryFn: () => getUser({ userId }),
		queryKey: [userId],
		enabled: !!userId && !!isLoggedIn,
	});

type UseGetUser = UseQueryResult<SuccessResponseV2<UserResponse>, unknown>;

export default useGetUser;
