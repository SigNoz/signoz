import React, { useState } from 'react';
import { Menu, Dropdown, Button, MenuItemProps, Space } from 'antd';
import { functions, groupBy } from './config';

const TraceGraphFilter = () => {
	const [selectedFunction, setSelectedFunction] = useState('Select Function');
	const [selectedGroupBy, setSelectedGroupBy] = useState('Select Group By');

	const onClickSelectedFunctionHandler: MenuItemProps['onClick'] = (ev) => {
		const selected = functions.find((e) => e.key === ev.key);

		if (selected) {
			setSelectedFunction(selected.displayValue);
		}
	};

	const onClickSelectedGroupByHandler: MenuItemProps['onClick'] = (ev) => {
		const selected = groupBy.find((e) => e.key === ev.key);

		if (selected) {
			setSelectedGroupBy(selected.displayValue);
		}
	};

	const functionMenu = (
		<Menu onClick={onClickSelectedFunctionHandler}>
			{functions.map(({ displayValue, key }) => (
				<Menu.Item key={key}>{displayValue}</Menu.Item>
			))}
		</Menu>
	);

	const groupByMenu = (
		<Menu onClick={onClickSelectedGroupByHandler}>
			{groupBy.map(({ displayValue, key }) => (
				<Menu.Item key={key}>{displayValue}</Menu.Item>
			))}
		</Menu>
	);

	return (
		<Space>
			<Dropdown overlay={functionMenu} trigger={['click']}>
				<Button>{selectedFunction}</Button>
			</Dropdown>

			<Dropdown overlay={groupByMenu} trigger={['click']}>
				<Button>{selectedGroupBy}</Button>
			</Dropdown>
		</Space>
	);
};

export default TraceGraphFilter;
