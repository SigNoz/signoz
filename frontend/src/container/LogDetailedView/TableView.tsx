import { blue, orange } from '@ant-design/colors';
import {
	MenuFoldOutlined,
	MinusCircleOutlined,
	PlusCircleFilled,
	PlusCircleOutlined,
} from '@ant-design/icons';
import { Button, Col, Input, Popover, Table, Typography } from 'antd';
import AddToQueryHOC from 'components/Logs/AddToQueryHOC';
import CopyClipboardHOC from 'components/Logs/CopyClipboardHOC';
import flatten from 'flat';
import { fieldSearchFilter } from 'lib/logs/fieldSearch';
import React, { useMemo, useState } from 'react';

import ActionItem from './ActionItem';

function TableView({ logData }) {
	const [fieldSearchInput, setFieldSearchInput] = useState<string>('');

	const flattenLogData = useMemo(() => (logData ? flatten(logData) : null), [
		logData,
	]);
	if (logData === null) {
		return null;
	}

	const dataSource = Object.keys(flattenLogData)
		.filter((field) => fieldSearchFilter(field, fieldSearchInput))
		.map((key) => {
			return {
				key,
				field: key,
				value: JSON.stringify(flattenLogData[key]),
			};
		});

	const columns = [
		{
			title: 'Action',
			width: 75,
			render: (fieldData) => (
				<ActionItem
					fieldKey={fieldData.field.split('.').slice(-1)}
					fieldValue={fieldData.value}
				/>
			),
		},
		{
			title: 'Field',
			dataIndex: 'field',
			key: 'field',
			width: '35%',
			render: (field: string) => (
				<AddToQueryHOC
					fieldKey={field.split('.').slice(-1)}
					fieldValue={flattenLogData[field]}
				>
					{' '}
					<span style={{ color: blue[4] }}>{field}</span>
				</AddToQueryHOC>
			),
		},
		{
			title: 'Value',
			dataIndex: 'value',
			key: 'value',
			ellipsis: false,
			render: (field) => (
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
				onChange={(e) => setFieldSearchInput(e.target.value)}
			/>
			<Table
				// scroll={{ x: true }}
				tableLayout='fixed'
				dataSource={dataSource}
				columns={columns}
				pagination={false}
			/>
		</div>
	);
}

export default TableView;
