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

const CheckBoxComponent = (props: CheckBoxProps): JSX.Element => {
	const { selectedFilter, filter } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const isPresent = selectedFilter.get(props.name) || [];

	const isSelected = isPresent.find((e) => e === props.keyValue) !== undefined;

	const onCheckHandler = () => {
		// updated the filter to fetch the data
		props.selectedTraceFilter({
			topic: props.name,
			value: props.keyValue,
		});
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
