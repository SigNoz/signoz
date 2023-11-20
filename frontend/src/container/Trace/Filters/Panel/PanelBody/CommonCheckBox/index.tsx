import { Button, Input } from 'antd';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import { INITIAL_FILTER_VALUE } from 'store/reducers/trace';
import AppActions from 'types/actions';
import { UPDATE_SPAN_UPDATE_FILTER_DISPLAY_VALUE } from 'types/actions/trace';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import CheckBoxComponent from '../Common/Checkbox';

const { Search } = Input;

function CommonCheckBox(props: CommonCheckBoxProps): JSX.Element {
	const { filter, filterDisplayValue } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const { name } = props;

	const status = filter.get(name) || {};

	const statusObj = Object.keys(status);
	const numberOfFilters = filterDisplayValue.get(name) || 0;
	const dispatch = useDispatch<Dispatch<AppActions>>();
	const [searchFilter, setSearchFilter] = useState<string>('');

	const onClickMoreHandler = (): void => {
		const newFilterDisplayValue = new Map(filterDisplayValue);
		const preValue =
			(newFilterDisplayValue.get(name) || 0) + INITIAL_FILTER_VALUE;

		newFilterDisplayValue.set(name, preValue);

		dispatch({
			type: UPDATE_SPAN_UPDATE_FILTER_DISPLAY_VALUE,
			payload: newFilterDisplayValue,
		});
	};

	const isMoreButtonAvilable = Boolean(
		numberOfFilters && statusObj.length > numberOfFilters,
	);

	return (
		<>
			{statusObj.length > 0 && (
				<Search
					value={searchFilter}
					onChange={(e): void => setSearchFilter(e.target.value)}
					style={{
						padding: '0 3%',
					}}
					placeholder="Filter Values"
				/>
			)}

			{statusObj
				.sort((a, b) => {
					const countA = +status[a];
					const countB = +status[b];

					if (countA === countB) {
						return a.length - b.length;
					}
					return countA - countB;
				})
				.filter((filter) => {
					if (searchFilter.length === 0) {
						return true;
					}
					return filter
						.toLocaleLowerCase()
						.includes(searchFilter.toLocaleLowerCase());
				})
				.filter((_, index) => index < numberOfFilters)
				.map((e) => (
					<CheckBoxComponent
						key={e}
						{...{
							name,
							keyValue: e,
							value: status[e],
						}}
					/>
				))}

			{isMoreButtonAvilable && (
				<Button onClick={onClickMoreHandler} type="link">
					More
				</Button>
			)}
		</>
	);
}

interface CommonCheckBoxProps {
	name: TraceFilterEnum;
}

export default CommonCheckBox;
