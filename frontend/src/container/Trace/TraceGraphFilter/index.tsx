import { AutoComplete, Input, Space } from 'antd';
import getTagFilters from 'api/trace/getTagFilter';
import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';
import { popupContainer } from 'utils/selectPopupContainer';

import { functions } from './config';
import { SelectComponent } from './styles';
import {
	filterGroupBy,
	getSelectedValue,
	initOptions,
	onClickSelectedFunctionHandler,
	onClickSelectedGroupByHandler,
	selectedGroupByValue,
} from './utils';

const { Option } = SelectComponent;

function TraceGraphFilter(): JSX.Element {
	const { selectedFunction, selectedGroupBy } = useSelector<
		AppState,
		TraceReducer
	>((state) => state.traces);
	const [selectedGroupByLocal, setSelectedGroupByLocal] = useState<string>(
		selectedGroupBy,
	);
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const { isLoading, data } = useQuery(
		[
			'getTagKeys',
			globalTime.minTime,
			globalTime.maxTime,
			traces.selectedFilter,
			traces.isFilterExclude,
			traces.spanKind,
		],
		{
			queryFn: () =>
				getTagFilters({
					start: globalTime.minTime,
					end: globalTime.maxTime,
					other: Object.fromEntries(traces.selectedFilter),
					isFilterExclude: traces.isFilterExclude,
					spanKind: traces.spanKind,
				}),
			cacheTime: 120000,
			enabled: traces.filter.size > 0,
		},
	);

	const options = useMemo(() => initOptions(data?.payload), [data?.payload]);

	return (
		<Space>
			<label htmlFor="selectedFunction">Function</label>

			<SelectComponent
				getPopupContainer={popupContainer}
				dropdownMatchSelectWidth
				data-testid="selectedFunction"
				id="selectedFunction"
				value={getSelectedValue(selectedFunction)}
				onChange={onClickSelectedFunctionHandler}
			>
				{functions.map((value) => (
					<Option value={value.key} key={value.key}>
						{value.displayValue}
					</Option>
				))}
			</SelectComponent>

			<label htmlFor="selectedGroupBy">Group By</label>
			<AutoComplete
				getPopupContainer={popupContainer}
				dropdownMatchSelectWidth
				id="selectedGroupBy"
				data-testid="selectedGroupBy"
				options={options}
				value={selectedGroupByValue(selectedGroupByLocal, options)}
				onChange={(e): void => setSelectedGroupByLocal(e.toString())}
				onSelect={onClickSelectedGroupByHandler(options)}
				filterOption={(inputValue, option): boolean =>
					filterGroupBy(inputValue, option)
				}
			>
				<Input disabled={isLoading} placeholder="Please select" />
			</AutoComplete>
		</Space>
	);
}

export default TraceGraphFilter;
