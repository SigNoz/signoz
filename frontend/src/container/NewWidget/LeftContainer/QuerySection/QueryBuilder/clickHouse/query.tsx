import { Input } from 'antd';
import MonacoEditor from 'components/Editor';
import React from 'react';
import { IClickHouseQuery } from 'types/api/dashboard/getAll';

import QueryHeader from '../QueryHeader';
import { IClickHouseQueryHandleChange } from './types';

interface IClickHouseQueryBuilderProps {
	queryData: IClickHouseQuery;
	queryIndex: number | string;
	handleQueryChange: (args: IClickHouseQueryHandleChange) => void;
}

function ClickHouseQueryBuilder({
	queryData,
	queryIndex,
	handleQueryChange,
}: IClickHouseQueryBuilderProps): JSX.Element | null {
	if (queryData === undefined) {
		return null;
	}

	return (
		<QueryHeader
			name={queryData.name}
			disabled={queryData.disabled}
			onDisable={(): void =>
				handleQueryChange({ queryIndex, toggleDisable: true })
			}
			onDelete={(): void => {
				handleQueryChange({ queryIndex, toggleDelete: true });
			}}
		>
			<MonacoEditor
				language="sql"
				height="200px"
				onChange={(value): void =>
					handleQueryChange({ queryIndex, rawQuery: value })
				}
				value={queryData.rawQuery}
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
				onChange={(event): void =>
					handleQueryChange({ queryIndex, legend: event.target.value })
				}
				size="middle"
				defaultValue={queryData.legend}
				value={queryData.legend}
				addonBefore="Legend Format"
			/>
		</QueryHeader>
	);
}

export default ClickHouseQueryBuilder;
