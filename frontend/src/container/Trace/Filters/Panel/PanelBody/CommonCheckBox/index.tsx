import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import CheckBoxComponent from '../Common/Checkbox';

function CommonCheckBox(props: CommonCheckBoxProps): JSX.Element {
	const { filter } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const { name } = props;

	const status = filter.get(name) || {};

	const statusObj = Object.keys(status);

	return (
		<>
			{statusObj.map((e) => (
				<CheckBoxComponent
					key={e}
					{...{
						name,
						keyValue: e,
						value: status[e],
					}}
				/>
			))}
		</>
	);
}

interface CommonCheckBoxProps {
	name: TraceFilterEnum;
}

export default CommonCheckBox;
