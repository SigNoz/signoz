import { Space } from 'antd';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_SELECTED_FUNCTION,
	UPDATE_SELECTED_GROUP_BY,
} from 'types/actions/trace';
import { TraceReducer } from 'types/reducer/trace';

import { functions, groupBy } from './config';
import { SelectComponent } from './styles';

const { Option } = SelectComponent;

function TraceGraphFilter(): JSX.Element {
	const { selectedFunction, selectedGroupBy } = useSelector<
		AppState,
		TraceReducer
	>((state) => state.traces);
	const dispatch = useDispatch<Dispatch<AppActions>>();

	const onClickSelectedFunctionHandler = (ev: unknown): void => {
		if (typeof ev === 'string') {
			const selected = functions.find((e) => e.key === ev);
			if (selected) {
				dispatch({
					type: UPDATE_SELECTED_FUNCTION,
					payload: {
						selectedFunction: selected.key,
						yAxisUnit: selected.yAxisUnit,
					},
				});
			}
		}
	};

	const onClickSelectedGroupByHandler = (ev: unknown): void => {
		if (typeof ev === 'string') {
			const selected = groupBy.find((e) => e.key === ev);
			if (selected) {
				dispatch({
					type: UPDATE_SELECTED_GROUP_BY,
					payload: {
						selectedGroupBy: selected.key,
					},
				});
			}
		}
	};

	return (
		<Space>
			<label htmlFor="selectedFunction">Function</label>

			<SelectComponent
				dropdownMatchSelectWidth
				data-testid="selectedFunction"
				id="selectedFunction"
				value={functions.find((e) => selectedFunction === e.key)?.displayValue}
				onChange={onClickSelectedFunctionHandler}
			>
				{functions.map((value) => (
					<Option value={value.key} key={value.key}>
						{value.displayValue}
					</Option>
				))}
			</SelectComponent>

			<label htmlFor="selectedGroupBy">Group By</label>
			<SelectComponent
				dropdownMatchSelectWidth
				id="selectedGroupBy"
				data-testid="selectedGroupBy"
				value={groupBy.find((e) => selectedGroupBy === e.key)?.displayValue}
				onChange={onClickSelectedGroupByHandler}
			>
				{groupBy.map(
					(value): JSX.Element => (
						<Option value={value.key} key={value.key}>
							{value.displayValue}
						</Option>
					),
				)}
			</SelectComponent>
		</Space>
	);
}

export default TraceGraphFilter;
