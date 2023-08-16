import { getAllViews } from 'api/saveView/getAllViews';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { AllViewsProps } from 'types/api/saveViews/types';

export const useGetAllViews = (
	sourcepage: string,
): UseQueryResult<AxiosResponse<AllViewsProps>, AxiosError> =>
	useQuery<AxiosResponse<AllViewsProps>, AxiosError>({
		queryKey: [{ sourcepage }],
		queryFn: () => getAllViews(sourcepage),
	});
