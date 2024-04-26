import { Input } from 'antd';
import { LEGEND } from 'constants/global';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ChangeEvent, useCallback } from 'react';
import { IPromQLQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { getFormatedLegend } from 'utils/getFormatedLegend';

import QueryHeader from '../QueryHeader';

interface IPromQLQueryBuilderProps {
	queryData: IPromQLQuery;
	queryIndex: number;
	deletable: boolean;
}

function PromQLQueryBuilder({
	queryData,
	queryIndex,
	deletable,
}: IPromQLQueryBuilderProps): JSX.Element {
	const {
		handleSetQueryItemData,
		removeQueryTypeItemByIndex,
	} = useQueryBuilder();

	const handleRemoveQuery = useCallback(() => {
		removeQueryTypeItemByIndex(EQueryType.PROM, queryIndex);
	}, [queryIndex, removeQueryTypeItemByIndex]);

	const handleUpdateQuery = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const { name } = e.target;
			let { value } = e.target;
			if (name === LEGEND) {
				value = getFormatedLegend(value);
			}
			const newQuery: IPromQLQuery = { ...queryData, [name]: value };

			handleSetQueryItemData(queryIndex, EQueryType.PROM, newQuery);
		},
		[handleSetQueryItemData, queryIndex, queryData],
	);

	const handleDisable = useCallback(() => {
		const newQuery: IPromQLQuery = {
			...queryData,
			disabled: !queryData.disabled,
		};

		handleSetQueryItemData(queryIndex, EQueryType.PROM, newQuery);
	}, [handleSetQueryItemData, queryData, queryIndex]);

	return (
		<QueryHeader
			name={queryData.name}
			disabled={queryData.disabled}
			onDisable={handleDisable}
			onDelete={handleRemoveQuery}
			deletable={deletable}
		>
			<Input
				onChange={handleUpdateQuery}
				size="middle"
				name="query"
				defaultValue={queryData.query}
				addonBefore="PromQL Query"
				style={{ marginBottom: '0.5rem' }}
			/>

			<Input
				onChange={handleUpdateQuery}
				size="middle"
				name="legend"
				defaultValue={queryData.legend}
				addonBefore="Legend Format"
				style={{ marginBottom: '0.5rem' }}
			/>
		</QueryHeader>
	);
}

export default PromQLQueryBuilder;
