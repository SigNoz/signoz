import { Button, Popover } from 'antd';
import { generateFilterQuery } from 'lib/logs/generateFilterQuery';
import React, { memo, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SET_SEARCH_QUERY_STRING } from 'types/actions/logs';
import { ILogsReducer } from 'types/reducer/logs';

function AddToQueryHOC({
	fieldKey,
	fieldValue,
	children,
}: AddToQueryHOCProps): JSX.Element {
	const {
		searchFilter: { queryString },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);
	const dispatch = useDispatch();

	const generatedQuery = useMemo(
		() => generateFilterQuery({ fieldKey, fieldValue, type: 'IN' }),
		[fieldKey, fieldValue],
	);

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
	}, [dispatch, generatedQuery, queryString]);

	const popOverContent = useMemo(() => <span>Add to query: {fieldKey}</span>, [
		fieldKey,
	]);

	return (
		<Button size="small" type="text" onClick={handleQueryAdd}>
			<Popover placement="top" content={popOverContent}>
				{children}
			</Popover>
		</Button>
	);
}

interface AddToQueryHOCProps {
	fieldKey: string;
	fieldValue: string;
	children: React.ReactNode;
}

export default memo(AddToQueryHOC);
