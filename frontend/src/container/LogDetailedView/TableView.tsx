import { blue, orange } from '@ant-design/colors';
import { Input, Table } from 'antd';
import AddToQueryHOC from 'components/Logs/AddToQueryHOC';
import CopyClipboardHOC from 'components/Logs/CopyClipboardHOC';
import flatten from 'flat';
import { fieldSearchFilter } from 'lib/logs/fieldSearch';
import React, { useMemo, useState } from 'react';
import { ILog } from 'types/api/logs/log';

import ActionItem from './ActionItem';

// Fields which should be restricted from adding it to query
const RESTRICTED_FIELDS = ['timestamp'];

interface TableViewProps {
	logData: ILog;
}
function TableView({ logData }: TableViewProps): JSX.Element | null {
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');

	const flattenLogData: Record<string, never> | null = useMemo(
		() => (logData ? flatten(logData) : null),
		[logData],
	);
	if (logData === null) {
		return null;
	}

	const dataSource =
		flattenLogData !== null &&
		Object.keys(flattenLogData)
			.filter((field) => fieldSearchFilter(field, fieldSearchInput))
			.map((key) => {
				return {
					key,
					field: key,
					value: JSON.stringify(flattenLogData[key]),
				};
			});

	if (!dataSource) {
		return null;
	}

	const columns = [
		{
			title: 'Action',
			width: 75,
			render: (fieldData: Record<string, string>): JSX.Element | null => {
				const fieldKey = fieldData.field.split('.').slice(-1);
				if (!RESTRICTED_FIELDS.includes(fieldKey[0])) {
					return <ActionItem fieldKey={fieldKey} fieldValue={fieldData.value} />;
				}
				return null;
			},
		},
		{
			title: 'Field',
			dataIndex: 'field',
			key: 'field',
			width: '35%',
			render: (field: string): JSX.Element => {
				const fieldKey = field.split('.').slice(-1);
				const renderedField = <span style={{ color: blue[4] }}>{field}</span>;

				if (!RESTRICTED_FIELDS.includes(fieldKey[0])) {
					return (
						<AddToQueryHOC fieldKey={fieldKey[0]} fieldValue={flattenLogData[field]}>
							{' '}
							{renderedField}
						</AddToQueryHOC>
					);
				}
				return renderedField;
			},
		},
		{
			title: 'Value',
			dataIndex: 'value',
			key: 'value',
			ellipsis: false,
			render: (field: never): JSX.Element => (
				<CopyClipboardHOC textToCopy={field}>
					<span style={{ color: orange[6] }}>{field}</span>
				</CopyClipboardHOC>
			),
			width: '60%',
		},
	];
	return (
		<div style={{ position: 'relative' }}>
			<Input
				placeholder="Search field names"
				size="large"
				value={fieldSearchInput}
				onChange={(e): void => setFieldSearchInput(e.target.value)}
			/>
			<Table
				// scroll={{ x: true }}
				tableLayout="fixed"
				dataSource={dataSource}
				columns={columns as never}
				pagination={false}
			/>
		</div>
	);
}

export default TableView;
