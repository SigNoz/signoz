import { Input } from 'antd';
import MonacoEditor from 'components/Editor';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { ChangeEvent, useCallback } from 'react';
import { IClickHouseQuery } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import QueryHeader from '../QueryHeader';

interface IClickHouseQueryBuilderProps {
	queryData: IClickHouseQuery;
	queryIndex: number;
	deletable: boolean;
}

function ClickHouseQueryBuilder({
	queryData,
	queryIndex,
	deletable,
}: IClickHouseQueryBuilderProps): JSX.Element | null {
	const {
		handleSetQueryItemData,
		removeQueryTypeItemByIndex,
	} = useQueryBuilder();

	const handleRemoveQuery = useCallback(() => {
		removeQueryTypeItemByIndex(EQueryType.CLICKHOUSE, queryIndex);
	}, [queryIndex, removeQueryTypeItemByIndex]);

	const handleUpdateQuery = useCallback(
		<Field extends keyof IClickHouseQuery, Value extends IClickHouseQuery[Field]>(
			field: keyof IClickHouseQuery,
			value: Value,
		) => {
			const newQuery: IClickHouseQuery = { ...queryData, [field]: value };

			handleSetQueryItemData(queryIndex, EQueryType.CLICKHOUSE, newQuery);
		},
		[handleSetQueryItemData, queryIndex, queryData],
	);

	const handleDisable = useCallback(() => {
		const newQuery: IClickHouseQuery = {
			...queryData,
			disabled: !queryData.disabled,
		};

		handleSetQueryItemData(queryIndex, EQueryType.CLICKHOUSE, newQuery);
	}, [handleSetQueryItemData, queryData, queryIndex]);

	const handleUpdateEditor = useCallback(
		(value: string) => {
			handleUpdateQuery('query', value);
		},
		[handleUpdateQuery],
	);

	const handleUpdateInput = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const { name, value } = e.target;
			handleUpdateQuery(name as keyof IClickHouseQuery, value);
		},
		[handleUpdateQuery],
	);

	return (
		<QueryHeader
			name={queryData.name}
			disabled={queryData.disabled}
			onDisable={handleDisable}
			onDelete={handleRemoveQuery}
			deletable={deletable}
		>
			<MonacoEditor
				language="sql"
				height="200px"
				onChange={handleUpdateEditor}
				value={queryData.query}
				options={{
					scrollbar: {
						alwaysConsumeMouseWheel: false,
					},
					minimap: {
						enabled: false,
					},
				}}
			/>
			<Input
				onChange={handleUpdateInput}
				name="legend"
				size="middle"
				defaultValue={queryData.legend}
				value={queryData.legend}
				addonBefore="Legend Format"
			/>
		</QueryHeader>
	);
}

export default ClickHouseQueryBuilder;
