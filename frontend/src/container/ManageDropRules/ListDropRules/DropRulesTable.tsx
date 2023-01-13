import {
	CaretDownOutlined,
	CaretUpOutlined,
	EditOutlined,
} from '@ant-design/icons';
import { Button, Space, Table, Tag } from 'antd';
import React from 'react';

import { DropRuleHeader } from '../DropRuleHeader';
import { ColumnButton } from './DropRulesTableStyles';

interface Props {
	rules: DropRuleHeader[];
}

function RulePrioritySelector({
	priority,
}: {
	priority: number;
}): JSX.Element | null {
	return (
		<Space wrap>
			{/* <Button type="text" style={{ padding: '2px' }}>
				<CaretUpOutlined />
			</Button>
			<Button type="text" style={{ padding: '2px' }}>
				<CaretDownOutlined />
	</Button> */}
			<span>{priority}</span>
			<Button type="text" style={{ padding: '2px' }}>
				<EditOutlined />
			</Button>
		</Space>
	);
}

function DropRulesTable({ rules }: Props): JSX.Element | null {
	const cols = [
		{
			title: 'Priority',
			dataIndex: 'priority',
			key: 'priority',
			width: '4rem',
			render: (value, record): JSX.Element => (
				<RulePrioritySelector priority={value} />
			),
		},
		{
			title: 'Status',
			dataIndex: 'status',
			key: 'status',
			width: '8rem',
			render: (value): JSX.Element => <Tag color="green">{value}</Tag>,
		},
		{
			title: 'Rule Name',
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: 'Rule Type',
			dataIndex: 'ruleType',
			key: 'ruleType',
			render: (value): JSX.Element | null => 'Always On',
		},
		{
			title: 'Action',
			dataIndex: 'action',
			key: 'action',
			render: (id: DropRuleHeader['id'], record): JSX.Element => {
				return (
					<>
						<ColumnButton type="link">Edit</ColumnButton>

						<ColumnButton type="link">Delete</ColumnButton>
					</>
				);
			},
		},
	];
	return <Table style={{ width: '100%' }} columns={cols} dataSource={rules} />;
}

export default DropRulesTable;
