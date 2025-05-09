import getUser from 'api/user/crud/get';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { UserResponse } from 'types/api/user/crud/get';

const useGetUser = (isLoggedIn: boolean): UseGetUser =>
	useQuery({
		queryFn: () => getUser(),
		queryKey: ['getMeUser'],
		enabled: !!isLoggedIn,
	});

type UseGetUser = UseQueryResult<SuccessResponseV2<UserResponse>, APIError>;

export default useGetUser;
