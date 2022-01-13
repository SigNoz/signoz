import React from 'react';
import { CheckBoxContainer } from './styles';
import { Checkbox, Typography } from 'antd';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

const CheckBoxComponent = (props: CheckBoxProps): JSX.Element => {
	const { filterToFetchData, selectedFilter } = useSelector<
		AppState,
		TraceReducer
	>((state) => state.traces);

	const isPresent = selectedFilter.get(props.name) || [];

	const isSelected = isPresent.find((e) => e === props.keyValue) !== undefined;

	const onCheckHandler = () => {
		// updated the filter to fetch the data
		console.log(filterToFetchData);
	};

	return (
		<CheckBoxContainer>
			<Checkbox onClick={onCheckHandler} checked={isSelected} key={props.keyValue}>
				{props.keyValue}
			</Checkbox>
			{props.value !== '-1' && <Typography>{props.value}</Typography>}
		</CheckBoxContainer>
	);
};

interface CheckBoxProps {
	keyValue: string;
	value: string;
	name: TraceFilterEnum;
}

export default CheckBoxComponent;
