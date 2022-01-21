import React from 'react';
import { Menu, Dropdown, Button, MenuItemProps, Space } from 'antd';
import { functions, groupBy } from './config';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import AppActions from 'types/actions';
import {
	UPDATE_SELECTED_FUNCTION,
	UPDATE_SELECTED_GROUP_BY,
} from 'types/actions/trace';
import { Dispatch } from 'redux';

const TraceGraphFilter = () => {
	const { selectedFunction, selectedGroupBy } = useSelector<
		AppState,
		TraceReducer
	>((state) => state.traces);
	const dispatch = useDispatch<Dispatch<AppActions>>();

	const onClickSelectedFunctionHandler: MenuItemProps['onClick'] = (ev) => {
		const selected = functions.find((e) => e.key === ev.key);

		if (selected) {
			dispatch({
				type: UPDATE_SELECTED_FUNCTION,
				payload: {
					selectedFunction: selected.key,
				},
			});
		}
	};

	const onClickSelectedGroupByHandler: MenuItemProps['onClick'] = (ev) => {
		const selected = groupBy.find((e) => e.key === ev.key);

		if (selected) {
			dispatch({
				type: UPDATE_SELECTED_GROUP_BY,
				payload: {
					selectedGroupBy: selected.key,
				},
			});
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
				<Button>
					{functions.find((e) => selectedFunction === e.key)?.displayValue ||
						'Select Function'}
				</Button>
			</Dropdown>

			<Dropdown overlay={groupByMenu} trigger={['click']}>
				<Button>
					{groupBy.find((e) => selectedGroupBy === e.key)?.displayValue ||
						'Select Group By'}
				</Button>
			</Dropdown>
		</Space>
	);
};

export default TraceGraphFilter;
