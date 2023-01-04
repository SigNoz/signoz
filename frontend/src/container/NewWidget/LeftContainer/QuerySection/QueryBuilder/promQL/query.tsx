import { Input } from 'antd';
import React from 'react';
import { IPromQLQuery } from 'types/api/dashboard/getAll';

import QueryHeader from '../QueryHeader';
import { IPromQLQueryHandleChange } from './types';

interface IPromQLQueryBuilderProps {
	queryData: IPromQLQuery;
	queryIndex: number | string;
	handleQueryChange: (args: IPromQLQueryHandleChange) => void;
}

function PromQLQueryBuilder({
	queryData,
	queryIndex,
	handleQueryChange,
}: IPromQLQueryBuilderProps): JSX.Element {
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
			<Input
				onChange={(event): void =>
					handleQueryChange({ queryIndex, query: event.target.value })
				}
				size="middle"
				defaultValue={queryData.query}
				addonBefore="PromQL Query"
				style={{ marginBottom: '0.5rem' }}
			/>

			<Input
				onChange={(event): void =>
					handleQueryChange({ queryIndex, legend: event.target.value })
				}
				size="middle"
				defaultValue={queryData.legend}
				addonBefore="Legend Format"
				style={{ marginBottom: '0.5rem' }}
			/>
		</QueryHeader>
	);
}

export default PromQLQueryBuilder;
