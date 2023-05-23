import { useNotifications } from 'hooks/useNotifications';
import { reverseParser } from 'lib/logql';
import { flatten } from 'lodash-es';
import { useCallback, useEffect, useRef, useState } from 'react';
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
	onDropDownToggleHandler: (value: boolean) => VoidFunction;
	updateQueryString: (value: string) => void;
}

function SearchFields({
	onDropDownToggleHandler,
	updateQueryString,
}: SearchFieldsProps): JSX.Element {
	const {
		searchFilter: { parsedQuery },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);

	const [fieldsQuery, setFieldsQuery] = useState(
		createParsedQueryStructure([...parsedQuery] as never[]),
	);

	const keyPrefixRef = useRef(hashCode(JSON.stringify(fieldsQuery)));

	const { notifications } = useNotifications();

	useEffect(() => {
		const updatedFieldsQuery = createParsedQueryStructure([
			...parsedQuery,
		] as never[]);
		setFieldsQuery(updatedFieldsQuery);
		const incomingHashCode = hashCode(JSON.stringify(updatedFieldsQuery));
		if (incomingHashCode !== keyPrefixRef.current) {
			keyPrefixRef.current = incomingHashCode;
		}
	}, [parsedQuery]);

	// syncKeyPrefix initiates re-render. useful in situations like
	// delete field (in search panel). this method allows condiitonally
	// setting keyPrefix as doing it on every update of query initiates
	// a re-render. this is a problem for text fields where input focus goes away.
	const syncKeyPrefix = (): void => {
		keyPrefixRef.current = hashCode(JSON.stringify(fieldsQuery));
	};

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
			notifications.error({
				message: 'Please enter a valid criteria for each of the selected fields',
			});
			return;
		}

		keyPrefixRef.current = hashCode(JSON.stringify(flatParsedQuery));
		updateQueryString(reverseParser(flatParsedQuery));
		onDropDownToggleHandler(false)();
	}, [fieldsQuery, notifications, onDropDownToggleHandler, updateQueryString]);

	const clearFilters = useCallback((): void => {
		keyPrefixRef.current = hashCode(JSON.stringify([]));
		setFieldsQuery([]);
		updateQueryString('');
	}, [updateQueryString]);

	return (
		<>
			<QueryBuilder
				key={keyPrefixRef.current}
				keyPrefix={keyPrefixRef.current}
				onDropDownToggleHandler={onDropDownToggleHandler}
				fieldsQuery={fieldsQuery}
				setFieldsQuery={setFieldsQuery}
				syncKeyPrefix={syncKeyPrefix}
			/>
			<SearchFieldsActionBar
				applyUpdate={applyUpdate}
				clearFilters={clearFilters}
			/>
			<Suggestions applySuggestion={addSuggestedField} />
		</>
	);
}
export default SearchFields;
