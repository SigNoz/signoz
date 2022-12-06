/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-bitwise */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable no-param-reassign */
/* eslint-disable react/no-array-index-key */
/* eslint-disable react-hooks/exhaustive-deps */
import { CloseOutlined, CloseSquareOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';
import CategoryHeading from 'components/Logs/CategoryHeading';
import {
	ConditionalOperators,
	QueryOperatorsMultiVal,
	QueryOperatorsSingleVal,
} from 'lib/logql/tokens';
import { flatten } from 'lodash-es';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ILogsReducer } from 'types/reducer/logs';
import { v4 } from 'uuid';

import { SearchFieldsProps } from '..';
import FieldKey from '../FieldKey';
import { QueryFieldContainer } from '../styles';
import { createParsedQueryStructure } from '../utils';
import { Container, QueryWrapper } from './styles';
import { hashCode, parseQuery } from './utils';

const { Option } = Select;

function QueryConditionField({
	query,
	queryIndex,
	onUpdate,
}: QueryConditionFieldProps): JSX.Element {
	const allOptions = Object.values(ConditionalOperators);
	return (
		<Select
			defaultValue={
				(query as any).value &&
				(((query as any)?.value as any) as string).toUpperCase()
			}
			onChange={(e): void => {
				onUpdate({ ...query, value: e }, queryIndex);
			}}
		>
			{allOptions.map((cond) => (
				<Option key={cond} value={cond} label={cond}>
					{cond}
				</Option>
			))}
		</Select>
	);
}

interface QueryFieldProps {
	query: Query;
	queryIndex: number;
	onUpdate: (query: unknown, queryIndex: number) => void;
	onDelete: (queryIndex: number) => void;
}
function QueryField({
	query,
	queryIndex,
	onUpdate,
	onDelete,
}: QueryFieldProps): JSX.Element | null {
	const {
		fields: { selected },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);

	const getFieldType = (inputKey: string): string => {
		// eslint-disable-next-line no-restricted-syntax
		for (const selectedField of selected) {
			if (inputKey === selectedField.name) {
				return selectedField.type;
			}
		}
		return '';
	};

	const fieldType = useMemo(() => getFieldType(query[0].value as string), [
		query,
	]);
	const handleChange = (qIdx: number, value: string): void => {
		query[qIdx].value = value || '';
		if (qIdx === 1) {
			if (Object.values(QueryOperatorsMultiVal).includes(value)) {
				if (!Array.isArray(query[2].value)) {
					query[2].value = [];
				}
			} else if (
				Object.values(QueryOperatorsSingleVal).includes(value) &&
				Array.isArray(query[2].value)
			) {
				query[2].value = '';
			}
		}
		onUpdate(query, queryIndex);
	};

	const handleClear = (): void => {
		onDelete(queryIndex);
	};
	if (!Array.isArray(query)) {
		return null;
	}

	return (
		<QueryFieldContainer
			style={{ ...(queryIndex === 0 && { gridColumnStart: 2 }) }}
		>
			<div style={{ flex: 1, minWidth: 100 }}>
				<FieldKey name={(query[0] && query[0].value) as string} type={fieldType} />
			</div>
			<Select
				defaultActiveFirstOption={false}
				placeholder="Select Operator"
				defaultValue={
					query[1] && query[1].value
						? (query[1].value as string).toUpperCase()
						: null
				}
				onChange={(e): void => handleChange(1, e)}
				style={{ minWidth: 150 }}
			>
				{Object.values({
					...QueryOperatorsMultiVal,
					...QueryOperatorsSingleVal,
				}).map((cond) => (
					<Option key={cond} value={cond} label={cond}>
						{cond}
					</Option>
				))}
			</Select>
			<div style={{ flex: 2 }}>
				{Array.isArray(query[2].value) ||
				Object.values(QueryOperatorsMultiVal).some(
					(op) => op.toUpperCase() === (query[1].value as string)?.toUpperCase(),
				) ? (
					<Select
						mode="tags"
						style={{ width: '100%' }}
						onChange={(e): void => handleChange(2, e as never)}
						defaultValue={(query[2] && query[2].value) || []}
						notFoundContent={null}
					/>
				) : (
					<Input
						onChange={(e): void => handleChange(2, e.target.value)}
						style={{ width: '100%' }}
						defaultValue={query[2] && query[2].value}
					/>
				)}
			</div>

			<Button
				icon={<CloseOutlined />}
				type="text"
				size="small"
				onClick={handleClear}
			/>
		</QueryFieldContainer>
	);
}

interface QueryConditionFieldProps {
	query: { value: string | string[]; type: string }[];
	queryIndex: number;
	onUpdate: (arg0: unknown, arg1: number) => void;
}

export type Query = { value: string | string[]; type: string }[];

function QueryBuilder({
	updateParsedQuery,
	onDropDownToggleHandler,
}: SearchFieldsProps): JSX.Element {
	const {
		searchFilter: { parsedQuery },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);

	const keyPrefixRef = useRef(hashCode(JSON.stringify(parsedQuery)));
	const [keyPrefix, setKeyPrefix] = useState(keyPrefixRef.current);
	const generatedQueryStructure = createParsedQueryStructure(
		parsedQuery as never[],
	);

	useEffect(() => {
		const incomingHashCode = hashCode(JSON.stringify(parsedQuery));
		if (incomingHashCode !== keyPrefixRef.current) {
			keyPrefixRef.current = incomingHashCode;
			setKeyPrefix(incomingHashCode);
		}
	}, [parsedQuery]);

	const handleUpdate = (query: Query, queryIndex: number): void => {
		const updatedParsedQuery = generatedQueryStructure;
		updatedParsedQuery[queryIndex] = parseQuery(query) as never;

		const flatParsedQuery = flatten(updatedParsedQuery).filter((q) => q.value);
		keyPrefixRef.current = hashCode(JSON.stringify(flatParsedQuery));
		updateParsedQuery(flatParsedQuery);
	};

	const handleDelete = (queryIndex: number): void => {
		const updatedParsedQuery = generatedQueryStructure;
		updatedParsedQuery.splice(queryIndex - 1, 2);

		const flatParsedQuery = flatten(updatedParsedQuery).filter((q) => q.value);
		keyPrefixRef.current = v4();
		updateParsedQuery(flatParsedQuery);
	};

	const QueryUI = (): JSX.Element | JSX.Element[] =>
		generatedQueryStructure.map((query, idx) => {
			if (Array.isArray(query))
				return (
					<QueryField
						key={keyPrefix + idx}
						query={query as never}
						queryIndex={idx}
						onUpdate={handleUpdate as never}
						onDelete={handleDelete}
					/>
				);

			return (
				<div key={keyPrefix + idx}>
					<QueryConditionField
						query={query}
						queryIndex={idx}
						onUpdate={handleUpdate as never}
					/>
				</div>
			);
		});

	return (
		<>
			<Container isMargin={generatedQueryStructure.length === 0}>
				<CategoryHeading>LOG QUERY BUILDER</CategoryHeading>
				<CloseSquareOutlined onClick={onDropDownToggleHandler(false)} />
			</Container>

			<QueryWrapper>{QueryUI()}</QueryWrapper>
		</>
	);
}

export default QueryBuilder;
