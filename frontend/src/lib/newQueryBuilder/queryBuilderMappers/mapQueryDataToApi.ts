import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import {
	MapData,
	MapQueryDataToApiResult,
} from 'types/api/queryBuilder/queryBuilderData';

export const mapQueryDataToApi = <Data extends MapData, Key extends keyof Data>(
	data: Data[],
	nameField: Key,
	tableParams?: GetQueryResultsProps['tableParams'],
): MapQueryDataToApiResult<Record<string, Data>> => {
	const newLegendMap: Record<string, string> = {};

	const preparedResult = data.reduce<Record<string, Data>>((acc, query) => {
		const newResult: Record<string, Data> = {
			...acc,
			[query[nameField] as string]: {
				...query,
				...tableParams?.pagination,
				...(tableParams?.selectColumns
					? { selectColumns: tableParams?.selectColumns }
					: null),
			},
		};

		newLegendMap[query[nameField] as string] = query.legend;

		return newResult;
	}, {} as Record<string, Data>);

	return {
		data: preparedResult,
		newLegendMap,
	};
};
