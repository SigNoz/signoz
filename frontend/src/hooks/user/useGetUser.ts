import getUser from 'api/user/getUser';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/user/getUser';

const useGetUser = (userId: string): UseGetUser =>
	useQuery({
		queryFn: () => getUser({ userId }),
		queryKey: [userId],
		enabled: !!userId,
	});

type UseGetUser = UseQueryResult<
	SuccessResponse<PayloadProps> | ErrorResponse,
	unknown
>;

export default useGetUser;
