import { CloseOutlined, CloseSquareOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';
import CategoryHeading from 'components/Logs/CategoryHeading';
import {
	ConditionalOperators,
	QueryOperatorsMultiVal,
	QueryOperatorsSingleVal,
} from 'lib/logql/tokens';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ILogsReducer } from 'types/reducer/logs';

import FieldKey from '../FieldKey';
import { QueryFieldContainer } from '../styles';
import { QueryFields } from '../utils';
import { Container, QueryWrapper } from './styles';

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
				(query as QueryFields).value &&
				(((((query as QueryFields)
					?.value as unknown) as QueryFields) as unknown) as string).toUpperCase()
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
	onUpdate: (query: Query, queryIndex: number) => void;
	onDelete: (queryIndex: number) => void;
}
function QueryField({
	query,
	queryIndex,
	onUpdate,
	onDelete,
}: QueryFieldProps): JSX.Element | null {
	const [isDropDownOpen, setIsDropDownOpen] = useState(false);

	const {
		fields: { selected },
	} = useSelector<AppState, ILogsReducer>((store) => store.logs);
	const getFieldType = useCallback(
		(inputKey: string): string => {
			const selectedField = selected.find((field) => inputKey === field.name);
			if (selectedField) {
				return selectedField.type;
			}
			return '';
		},
		[selected],
	);

	const fieldType = useMemo(() => getFieldType(query[0].value as string), [
		getFieldType,
		query,
	]);

	const handleChange = (qIdx: number, value: string): void => {
		const updatedQuery = [...query];
		updatedQuery[qIdx].value = value || '';

		if (qIdx === 1) {
			if (Object.values(QueryOperatorsMultiVal).includes(value)) {
				if (!Array.isArray(updatedQuery[2].value)) {
					updatedQuery[2].value = [];
				}
			} else if (
				Object.values(QueryOperatorsSingleVal).includes(value) &&
				Array.isArray(updatedQuery[2].value)
			) {
				updatedQuery[2].value = '';
			}
		}
		onUpdate(updatedQuery, queryIndex);
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
						open={isDropDownOpen}
						onChange={(e): void => handleChange(2, e as never)}
						defaultValue={(query[2] && query[2].value) || []}
						notFoundContent={null}
						onInputKeyDown={(): void => setIsDropDownOpen(true)}
						onSelect={(): void => setIsDropDownOpen(false)}
					/>
				) : (
					<Input
						onChange={(e): void => {
							handleChange(2, e.target.value);
						}}
						style={{ width: '100%' }}
						defaultValue={query[2] && query[2].value}
						value={query[2] && query[2].value}
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
	query: QueryFields;
	queryIndex: number;
	onUpdate: (arg0: unknown, arg1: number) => void;
}

export type Query = { value: string | string[]; type: string }[];

export interface QueryBuilderProps {
	keyPrefix: string;
	onDropDownToggleHandler: (value: boolean) => VoidFunction;
	fieldsQuery: QueryFields[][];
	setFieldsQuery: (q: QueryFields[][]) => void;
	syncKeyPrefix: () => void;
}

function QueryBuilder({
	keyPrefix,
	fieldsQuery,
	setFieldsQuery,
	onDropDownToggleHandler,
	syncKeyPrefix,
}: QueryBuilderProps): JSX.Element {
	const handleUpdate = (query: Query, queryIndex: number): void => {
		const updated = [...fieldsQuery];
		updated[queryIndex] = query as never; // parseQuery(query) as never;
		setFieldsQuery(updated);
	};

	const handleDelete = (queryIndex: number): void => {
		const updated = [...fieldsQuery];
		if (queryIndex !== 0) updated.splice(queryIndex - 1, 2);
		else updated.splice(queryIndex, 2);

		setFieldsQuery(updated);

		// initiate re-render query panel
		syncKeyPrefix();
	};

	const QueryUI = (
		fieldsQuery: QueryFields[][],
	): JSX.Element | JSX.Element[] => {
		const result: JSX.Element[] = [];
		fieldsQuery.forEach((query, idx) => {
			if (Array.isArray(query) && query.length > 1) {
				result.push(
					<QueryField
						key={keyPrefix}
						query={query}
						queryIndex={idx}
						onUpdate={handleUpdate}
						onDelete={handleDelete}
					/>,
				);
			} else {
				result.push(
					<div key={keyPrefix}>
						<QueryConditionField
							query={Array.isArray(query) ? query[0] : query}
							queryIndex={idx}
							onUpdate={handleUpdate as never}
						/>
					</div>,
				);
			}
		});
		return result;
	};

	return (
		<>
			<Container isMargin={fieldsQuery.length === 0}>
				<CategoryHeading>LOG QUERY BUILDER</CategoryHeading>
				<CloseSquareOutlined onClick={onDropDownToggleHandler(false)} />
			</Container>

			<QueryWrapper key={keyPrefix}>{QueryUI(fieldsQuery)}</QueryWrapper>
		</>
	);
}

export default QueryBuilder;
