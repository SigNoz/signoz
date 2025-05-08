import getUser from 'api/user/getUser';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { UserResponse } from 'types/api/user/getUser';

const useGetUser = (userId: string, isLoggedIn: boolean): UseGetUser =>
	useQuery({
		queryFn: () => getUser({ userId }),
		queryKey: [userId],
		enabled: !!userId && !!isLoggedIn,
	});

type UseGetUser = UseQueryResult<SuccessResponseV2<UserResponse>, APIError>;

export default useGetUser;
