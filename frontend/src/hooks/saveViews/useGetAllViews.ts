import { getAllViews } from 'api/saveView/getAllViews';
import { AxiosError, AxiosResponse } from 'axios';
import { useQuery, UseQueryResult } from 'react-query';
import { AllViewsProps } from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';

export const useGetAllViews = (
	sourcepage: DataSource,
): UseQueryResult<AxiosResponse<AllViewsProps>, AxiosError> =>
	useQuery<AxiosResponse<AllViewsProps>, AxiosError>({
		queryKey: [{ sourcepage }],
		queryFn: () => getAllViews(sourcepage),
	});
