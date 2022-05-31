import { Input } from 'antd';
import MonacoEditor from 'components/Editor';
import React, { useEffect, useState } from 'react';

import { InputContainer } from '../../styles';
import QueryHeader from '../QueryHeader';

function ClickHouseQueryBuilder({
	queryData,
	queryIndex,
	handleQueryChange,
}): JSX.Element {
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
				handleQueryChange({ queryIndex, toggleDelete: true })
			}}
		>
			<MonacoEditor
				language="sql"
				theme="vs-dark"
				height="200px"
				onChange={(value) => handleQueryChange({ queryIndex, rawQuery: value })}
				value={queryData.rawQuery}
				options={{
					scrollbar: {
						alwaysConsumeMouseWheel: false,
					},
				}}
			/>
		</QueryHeader>
	);
}

export default ClickHouseQueryBuilder;
