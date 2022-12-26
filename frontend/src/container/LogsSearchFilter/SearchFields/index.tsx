import { notification } from 'antd';
import { flatten } from 'lodash-es';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ILogsReducer } from 'types/reducer/logs';

import { SearchFieldsActionBar } from './ActionBar';
import QueryBuilder from './QueryBuilder/QueryBuilder';
import Suggestions from './Suggestions';
import {
	createParsedQueryStructure,
	fieldsQueryIsvalid,
	hashCode,
	initQueryKOVPair,
	prepareConditionOperator,
	QueryFields,
} from './utils';

export interface SearchFieldsProps {
	updateParsedQuery: (query: QueryFields[]) => void;
	onDropDownToggleHandler: (value: boolean) => VoidFunction;
}

function SearchFields({
	updateParsedQuery,
	onDropDownToggleHandler,
}: SearchFieldsProps): JSX.Element {
	const {
		searchFilter: { parsedQuery },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);

	const [fieldsQuery, setFieldsQuery] = useState(
		createParsedQueryStructure([...parsedQuery] as never[]),
	);

	const keyPrefixRef = useRef(hashCode(JSON.stringify(fieldsQuery)));

	useEffect(() => {
		setFieldsQuery(createParsedQueryStructure([...parsedQuery] as never[]));
	}, [parsedQuery]);

	const addSuggestedField = useCallback(
		(name: string): void => {
			if (!name) {
				return;
			}

			const query = [...fieldsQuery];

			if (fieldsQuery.length > 0) {
				query.push([prepareConditionOperator()]);
			}

			const newField: QueryFields[] = [];
			initQueryKOVPair(name).forEach((q) => newField.push(q));

			query.push(newField);
			keyPrefixRef.current = hashCode(JSON.stringify(query));
			setFieldsQuery(query);
		},
		[fieldsQuery, setFieldsQuery],
	);

	const applyUpdate = useCallback((): void => {
		const flatParsedQuery = flatten(fieldsQuery);

		if (!fieldsQueryIsvalid(flatParsedQuery)) {
			notification.error({
				message: 'Please enter a valid criteria for each of the selected fields',
			});
			return;
		}

		keyPrefixRef.current = hashCode(JSON.stringify(flatParsedQuery));
		updateParsedQuery(flatParsedQuery);
		onDropDownToggleHandler(false)();
	}, [onDropDownToggleHandler, fieldsQuery, updateParsedQuery]);

	const clearFilters = useCallback((): void => {
		keyPrefixRef.current = hashCode(JSON.stringify([]));
		updateParsedQuery([]);
		onDropDownToggleHandler(false)();
	}, [onDropDownToggleHandler, updateParsedQuery]);

	return (
		<>
			<QueryBuilder
				key={keyPrefixRef.current}
				keyPrefix={keyPrefixRef.current}
				onDropDownToggleHandler={onDropDownToggleHandler}
				fieldsQuery={fieldsQuery}
				setFieldsQuery={setFieldsQuery}
			/>
			<SearchFieldsActionBar
				applyUpdate={applyUpdate}
				clearFilters={clearFilters}
				fieldsQuery={fieldsQuery}
			/>
			<Suggestions applySuggestion={addSuggestedField} />
		</>
	);
}
export default SearchFields;
