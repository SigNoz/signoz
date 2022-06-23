import { Input } from 'antd';
import MonacoEditor from 'components/Editor';
import React from 'react';

import QueryHeader from '../QueryHeader';

function ClickHouseQueryBuilder({
	queryData,
	queryIndex,
	handleQueryChange,
}): JSX.Element | null {
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
				theme="vs-dark"
				height="200px"
				onChange={(value): void =>
					handleQueryChange({ queryIndex, rawQuery: value })
				}
				value={queryData.rawQuery}
				options={{
					scrollbar: {
						alwaysConsumeMouseWheel: false,
					},
				}}
			/>
			<Input
				onChange={(event): void =>
					handleQueryChange({ queryIndex, legend: event.target.value })
				}
				size="middle"
				defaultValue={queryData.legend}
				addonBefore="Legend Format"
			/>
		</QueryHeader>
	);
}

export default ClickHouseQueryBuilder;
