import React from 'react';
import { Space, SelectProps } from 'antd';
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
import { SelectComponent } from './styles';
import { SelectValue } from 'antd/lib/select';

const { Option } = SelectComponent;

const TraceGraphFilter = () => {
	const { selectedFunction, selectedGroupBy } = useSelector<
		AppState,
		TraceReducer
	>((state) => state.traces);
	const dispatch = useDispatch<Dispatch<AppActions>>();

	const onClickSelectedFunctionHandler: SelectProps<SelectValue>['onChange'] = (
		ev,
	) => {
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
	};

	const onClickSelectedGroupByHandler: SelectProps<SelectValue>['onChange'] = (
		ev,
	) => {
		const selected = groupBy.find((e) => e.key === ev);
		if (selected) {
			dispatch({
				type: UPDATE_SELECTED_GROUP_BY,
				payload: {
					selectedGroupBy: selected.key,
				},
			});
		}
	};

	return (
		<Space>
			<label>Function</label>

			<SelectComponent
				dropdownMatchSelectWidth
				data-testid="selectedFunction"
				value={functions.find((e) => selectedFunction === e.key)?.displayValue}
				onChange={onClickSelectedFunctionHandler}
			>
				{functions.map((value) => (
					<Option value={value.key} key={value.key}>
						{value.displayValue}
					</Option>
				))}
			</SelectComponent>

			<label>Group By</label>
			<SelectComponent
				dropdownMatchSelectWidth
				data-testid="selectedGroupBy"
				value={groupBy.find((e) => selectedGroupBy === e.key)?.displayValue}
				onChange={onClickSelectedGroupByHandler}
			>
				{groupBy.map((value) => (
					<Option value={value.key} key={value.key}>
						{value.displayValue}
					</Option>
				))}
			</SelectComponent>
		</Space>
	);
};

export default TraceGraphFilter;
