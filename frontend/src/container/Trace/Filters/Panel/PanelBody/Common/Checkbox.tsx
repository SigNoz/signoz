import React from 'react';
import { CheckBoxContainer } from './styles';
import { Checkbox, Typography } from 'antd';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import { SelectedTraceFilter } from 'store/actions/trace/selectTraceFilter';
import AppActions from 'types/actions';
import { ThunkDispatch } from 'redux-thunk';
import { bindActionCreators } from 'redux';
import { updateURL } from 'store/actions/trace/util';

const CheckBoxComponent = (props: CheckBoxProps): JSX.Element => {
	const { selectedFilter, filter, filterLoading,filterToFetchData } = useSelector<
		AppState,
		TraceReducer
	>((state) => state.traces);

	const isPresent = selectedFilter.get(props.name) || [];

	const isSelected = isPresent.find((e) => e === props.keyValue) !== undefined;

	const onCheckHandler = () => {
		const newSelectedMap = new Map(selectedFilter);

		const isTopicPresent = newSelectedMap.get(props.name);

		// append the value
		if (!isTopicPresent) {
			newSelectedMap.set(props.name, [props.keyValue]);
		} else {
			const isValuePresent =
				isTopicPresent.find((e) => e === props.keyValue) !== undefined;

			// check the value if present then remove the value
			if (isValuePresent) {
				newSelectedMap.set(
					props.name,
					isTopicPresent.filter((e) => e !== props.keyValue),
				);
			} else {
				// if not present add into the array of string
				newSelectedMap.set(props.name, [...isTopicPresent, props.keyValue]);
			}
		}

		const mergedMaps = new Map([...selectedFilter, ...newSelectedMap]);
		updateURL(filter, mergedMaps,filterToFetchData);
	};

	return (
		<CheckBoxContainer>
			<Checkbox
				disabled={filterLoading}
				onClick={onCheckHandler}
				checked={isSelected}
				key={props.keyValue}
			>
				{props.keyValue}
			</Checkbox>
			{props.value !== '-1' && <Typography>{props.value}</Typography>}
		</CheckBoxContainer>
	);
};

interface DispatchProps {
	selectedTraceFilter: (props: {
		topic: TraceFilterEnum;
		value: string;
	}) => void;
}

interface CheckBoxProps extends DispatchProps {
	keyValue: string;
	value: string;
	name: TraceFilterEnum;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	selectedTraceFilter: bindActionCreators(SelectedTraceFilter, dispatch),
});

export default connect(null, mapDispatchToProps)(CheckBoxComponent);
