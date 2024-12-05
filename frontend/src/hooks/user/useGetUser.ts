import getUser from 'api/user/getUser';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/user/getUser';

const useGetUser = (userId: string, token: string): UseGetUser =>
	useQuery({
		queryFn: () => getUser({ userId, token }),
		queryKey: [userId],
		enabled: !!userId && !!token,
	});

type UseGetUser = UseQueryResult<
	SuccessResponse<PayloadProps> | ErrorResponse,
	unknown
>;

export default useGetUser;
