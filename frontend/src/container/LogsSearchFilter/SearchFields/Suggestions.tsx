import { Button, Typography } from 'antd';
import CategoryHeading from 'components/Logs/CategoryHeading';
import { map } from 'lodash-es';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ADD_SEARCH_FIELD_QUERY_STRING } from 'types/actions/logs';
import ILogsReducer from 'types/reducer/logs';

import FieldKey from './FieldKey';

function SuggestedItem({ name, type }) {
	const dispatch = useDispatch();

	const addSuggestedField = () => {
		dispatch({
			type: ADD_SEARCH_FIELD_QUERY_STRING,
			payload: name,
		});
	};
	return (
		<Button
			type="text"
			style={{ display: 'block', padding: '0.2rem' }}
			onClick={addSuggestedField}
		>
			<FieldKey name={name} type={type} />
		</Button>
	);
}

function Suggestions() {
	const {
		fields: { selected },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);

	return (
		<div>
			<CategoryHeading>SUGGESTIONS</CategoryHeading>
			<div>
				{map(selected, (field) => (
					<SuggestedItem
						key={JSON.stringify(field)}
						name={field.name}
						type={field.type}
					/>
				))}
			</div>
		</div>
	);
}

export default Suggestions;
