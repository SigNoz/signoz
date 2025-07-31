import { getKeySuggestions } from 'api/querySuggestions/getKeySuggestions';
import { AxiosError, AxiosResponse } from 'axios';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import {
	QueryKeyRequestProps,
	QueryKeySuggestionsResponseProps,
} from 'types/api/querySuggestions/types';

type UseGetQueryKeySuggestions = (
	requestData: QueryKeyRequestProps,
	options?: UseQueryOptions<
		AxiosResponse<QueryKeySuggestionsResponseProps>,
		AxiosError
	>,
) => UseQueryResult<
	AxiosResponse<QueryKeySuggestionsResponseProps>,
	AxiosError
>;

export const useGetQueryKeySuggestions: UseGetQueryKeySuggestions = (
	{
		signal,
		searchText,
		fieldContext,
		fieldDataType,
		metricName,
	}: QueryKeyRequestProps,
	options?: UseQueryOptions<
		AxiosResponse<QueryKeySuggestionsResponseProps>,
		AxiosError
	>,
) => {
	const queryKey = useMemo(() => {
		if (options?.queryKey && Array.isArray(options.queryKey)) {
			return ['queryKeySuggestions', ...options.queryKey];
		}
		return [
			'queryKeySuggestions',
			signal,
			searchText,
			metricName,
			fieldContext,
			fieldDataType,
		];
	}, [
		options?.queryKey,
		signal,
		searchText,
		metricName,
		fieldContext,
		fieldDataType,
	]);
	return useQuery<AxiosResponse<QueryKeySuggestionsResponseProps>, AxiosError>({
		queryKey,
		queryFn: () =>
			getKeySuggestions({
				signal,
				searchText,
				metricName,
				fieldContext,
				fieldDataType,
			}),
		...options,
	});
};
