import { Button, Popover, Tag, Tooltip } from 'antd';
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SET_SEARCH_QUERY_STRING } from 'types/actions/logs';
import ILogsReducer from 'types/reducer/logs';

function AddToQueryHOC({ fieldKey, fieldValue, children }) {
	const {
		searchFilter: { queryString },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);
	const dispatch = useDispatch();

	const generatedQuery = useMemo(() => {
		let generatedQueryString = `${fieldKey} IN `;
		if (typeof fieldValue === 'number') {
			generatedQueryString += `(${fieldValue})`;
		} else {
			generatedQueryString += `('${fieldValue}')`;
		}

		return generatedQueryString;
	}, [fieldKey, fieldValue]);

	const handleQueryAdd = useCallback(() => {
		let updatedQueryString = queryString || '';

		if (updatedQueryString.length === 0) {
			updatedQueryString += `${generatedQuery}`;
		} else {
			updatedQueryString += ` AND ${generatedQuery}`;
		}
		dispatch({
			type: SET_SEARCH_QUERY_STRING,
			payload: updatedQueryString,
		});
	}, [generatedQuery, queryString]);

	const popOverContent = (
		<span style={{ fontSize: '0.7rem' }}>
			Add to query <Tag>{generatedQuery}</Tag>
		</span>
	);
	return (
		<Button
			size="small"
			type="text"
			style={{
				margin: 0,
				padding: 0,
			}}
			onClick={handleQueryAdd}
		>
			<Popover placement="top" content={popOverContent}>
				{children}
			</Popover>
		</Button>
	);
}

export default AddToQueryHOC;
