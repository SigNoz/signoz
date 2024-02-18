import './QueryFunctions.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Flex, Input, Select, Tooltip } from 'antd';
import {
	queryFunctionOptions,
	queryFunctionsTypesConfig,
} from 'constants/queryFunctionOptions';
import debounce from 'lodash-es/debounce';
import { FunctionSquare, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { QueryFunctionProps } from 'types/api/queryBuilder/queryBuilderData';
import { QueryFunctionsTypes } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

const defaultFunctionStruct: QueryFunctionProps = {
	name: QueryFunctionsTypes.CUTOFF_MIN,
	args: [],
};

interface QueryFunctionsProps {
	queryFunctions: QueryFunctionProps[];
	onChange: (functions: QueryFunctionProps[]) => void;
}

export default function QueryFunctions({
	queryFunctions,
	onChange,
}: QueryFunctionsProps): JSX.Element {
	const [functions, setFunctions] = useState<QueryFunctionProps[]>(
		queryFunctions,
	);

	const handleAddNewFunction = (): void => {
		const updatedFunctionsArr = [
			...functions,
			{
				...defaultFunctionStruct,
				id: uuid(),
			},
		];

		setFunctions(updatedFunctionsArr);

		onChange(updatedFunctionsArr);
	};

	const handleDeleteFunction = (
		queryFunction: QueryFunctionProps,
		index: number,
	): void => {
		console.log('function', queryFunction, index);

		const filteredQueryFunctions = functions.filter(
			(func) => queryFunction.id !== func.id,
		);

		setFunctions(filteredQueryFunctions);
		onChange(filteredQueryFunctions);
	};

	const handleUpdateFunctionName = (
		func: QueryFunctionProps,
		index: number,
		value: string,
	): void => {
		console.log(func);

		const updateFunctions = [...functions];

		for (let index = 0; index < updateFunctions.length; index++) {
			if (updateFunctions[index].id === func.id) {
				updateFunctions[index].name = value;
				setFunctions(updateFunctions);
				onChange(updateFunctions);
			}
		}
	};

	const handleUpdateFunctionArgs = (
		func: QueryFunctionProps,
		index: number,
		value: string,
	): void => {
		console.log(func, index, value);

		const updateFunctions = [...functions];

		for (let index = 0; index < updateFunctions.length; index++) {
			if (updateFunctions[index].id === func.id) {
				updateFunctions[index].args = [value];
				setFunctions(updateFunctions);
				onChange(updateFunctions);
			}
		}
	};

	const debouncedhandleUpdateFunctionArgs = debounce(
		handleUpdateFunctionArgs,
		500,
	);

	return (
		<div className="query-functions-container">
			<div className="query-functions-list">
				{functions.map((func, index) => {
					console.log('func', func, queryFunctionsTypesConfig);

					const { showInput, placeholder } = queryFunctionsTypesConfig[func.name];

					console.log('showInput', showInput);

					// eslint-disable-next-line react/no-array-index-key
					return (
						<Flex className="query-function" key={func.id} gap={8}>
							<>
								<Button className="periscope-btn">
									<FunctionSquare size={16} />
								</Button>
								<Select
									value={func.name}
									style={{ minWidth: '180px' }}
									onChange={(value): void => {
										handleUpdateFunctionName(func, index, value);
									}}
									options={queryFunctionOptions}
								/>
							</>

							<Input
								disabled={!showInput}
								placeholder={func.args[0] || placeholder}
								onChange={(event): void => {
									debouncedhandleUpdateFunctionArgs(func, index, event.target.value);
								}}
							/>

							<Button
								className="periscope-btn"
								onClick={(): void => {
									handleDeleteFunction(func, index);
								}}
							>
								<Trash2 size={16} />
							</Button>
						</Flex>
					);
				})}
			</div>

			<Tooltip title="Add New Function" placement="right">
				<Button
					className="periscope-btn add-function-btn"
					onClick={handleAddNewFunction}
				>
					<FunctionSquare size={16} color={Color.BG_INK_500} />
					<Plus size={12} color={Color.BG_INK_500} />
				</Button>
			</Tooltip>
		</div>
	);
}
