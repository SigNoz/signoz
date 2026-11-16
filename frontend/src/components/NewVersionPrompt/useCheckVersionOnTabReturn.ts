import { useQuery } from 'react-query';
import getUserVersion from 'api/v1/version/get';
import { useAppContext } from 'providers/App/App';

export function useCheckVersionOnTabReturn(): void {
	const { isLoggedIn, user } = useAppContext();
	useQuery({
		queryFn: getUserVersion,
		queryKey: ['getUserVersion', user?.accessJwt],
		enabled: isLoggedIn,
		refetchOnWindowFocus: true,
	});
}
