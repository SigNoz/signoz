import { Button, notification, Row } from 'antd';
import { flatten } from 'lodash-es';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ILogsReducer } from 'types/reducer/logs';

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
		const updatedFieldsQuery = createParsedQueryStructure([
			...parsedQuery,
		] as never[]);
		setFieldsQuery(updatedFieldsQuery);
		const incomingHashCode = hashCode(JSON.stringify(updatedFieldsQuery));
		if (incomingHashCode !== keyPrefixRef.current) {
			keyPrefixRef.current = incomingHashCode;
		}
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

	const applyUpdate = useCallback(
		(e): void => {
			e.preventDefault();
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
		},
		[onDropDownToggleHandler, fieldsQuery, updateParsedQuery],
	);

	return (
		<>
			<QueryBuilder
				key={keyPrefixRef.current}
				keyPrefix={keyPrefixRef.current}
				onDropDownToggleHandler={onDropDownToggleHandler}
				fieldsQuery={fieldsQuery}
				setFieldsQuery={setFieldsQuery}
			/>
			<Row style={{ justifyContent: 'flex-end', paddingRight: '2.4rem' }}>
				<Button type="primary" onClick={applyUpdate}>
					Apply
				</Button>
			</Row>
			<Suggestions applySuggestion={addSuggestedField} />
		</>
	);
}
export default SearchFields;
