import React, { useState } from 'react';
import { Menu, Dropdown, Button, MenuItemProps } from 'antd';

const TraceGraphFilter = () => {
	const [selectedFunction, setSelectedFunction] = useState('Select Function');
	const [selectedGroupBy, setSelectedGroupBy] = useState('Select Group By');

	const onClickSelectedFunctionHandler: MenuItemProps['onClick'] = (e) => {
		setSelectedFunction(e.key);
	};

	const onClickSelectedGroupByHandler: MenuItemProps['onClick'] = (e) => {
		setSelectedGroupBy(e.key);
	};

	const menu = (
		<Menu onClick={onClickSelectedFunctionHandler}>
			<Menu.Item key="0">asd</Menu.Item>
			<Menu.Item key="1">asd</Menu.Item>
			<Menu.Divider />
			<Menu.Item key="3">3rd menu item</Menu.Item>
		</Menu>
	);

	const groupBy = (
		<Menu onClick={onClickSelectedGroupByHandler}>
			<Menu.Item key="0">asd</Menu.Item>
			<Menu.Item key="1">asd</Menu.Item>
			<Menu.Divider />
			<Menu.Item key="3">3rd menu item</Menu.Item>
		</Menu>
	);

	return (
		<>
			<Dropdown overlay={menu} trigger={['click']}>
				<Button>{selectedFunction}</Button>
			</Dropdown>

			<Dropdown overlay={groupBy} trigger={['click']}>
				<Button>{selectedGroupBy}</Button>
			</Dropdown>
		</>
	);
};

export default TraceGraphFilter;
