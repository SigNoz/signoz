import { Popover } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { generateFilterQuery } from 'lib/logs/generateFilterQuery';
import React, { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ILogsReducer } from 'types/reducer/logs';

import { ButtonContainer } from './styles';

function AddToQueryHOC({
	fieldKey,
	fieldValue,
	children,
}: AddToQueryHOCProps): JSX.Element {
	const {
		searchFilter: { queryString },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);

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

		history.replace(`${ROUTES.LOGS}?q=${updatedQueryString}`);
	}, [generatedQuery, queryString]);

	const popOverContent = useMemo(() => <span>Add to query: {fieldKey}</span>, [
		fieldKey,
	]);

	return (
		<ButtonContainer size="small" type="text" onClick={handleQueryAdd}>
			<Popover placement="top" content={popOverContent}>
				{children}
			</Popover>
		</ButtonContainer>
	);
}

interface AddToQueryHOCProps {
	fieldKey: string;
	fieldValue: string;
	children: React.ReactNode;
}

export default memo(AddToQueryHOC);
