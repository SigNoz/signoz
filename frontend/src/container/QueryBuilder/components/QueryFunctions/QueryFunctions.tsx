import './QueryFunctions.styles.scss';

import { Button, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { cloneDeep, pullAt } from 'lodash-es';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import {
	IBuilderQuery,
	QueryFunctionProps,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, QueryFunctionsTypes } from 'types/common/queryBuilder';

import Function from './Function';
import { toFloat64 } from './utils';

const defaultMetricFunctionStruct: QueryFunctionProps = {
	name: QueryFunctionsTypes.CUTOFF_MIN,
	args: [],
};

const defaultLogFunctionStruct: QueryFunctionProps = {
	name: QueryFunctionsTypes.TIME_SHIFT,
	args: [],
};

interface QueryFunctionsProps {
	query: IBuilderQuery;
	queryFunctions: QueryFunctionProps[];
	onChange: (functions: QueryFunctionProps[]) => void;
	maxFunctions: number;
}

// SVG component
function FunctionIcon({
	fillColor = 'white',
	className,
}: {
	fillColor: string;
	className: string;
}): JSX.Element {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M3 18.13C5.71436 18.13 6.8001 16.7728 6.8001 14.3299V8.62978C6.8001 5.91542 8.15728 4.15109 11.1431 4.55824"
				stroke={fillColor}
				strokeWidth="1.995"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M3 10.2583H10.7359"
				stroke={fillColor}
				strokeWidth="1.995"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M22.0005 11.344L15.2146 18.1299"
				stroke={fillColor}
				strokeWidth="1.995"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M15.2146 11.344L22.0005 18.1299"
				stroke={fillColor}
				strokeWidth="1.995"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default function QueryFunctions({
	query,
	queryFunctions,
	onChange,
	maxFunctions = 3,
}: QueryFunctionsProps): JSX.Element {
	const [functions, setFunctions] = useState<QueryFunctionProps[]>(
		queryFunctions,
	);

	const isDarkMode = useIsDarkMode();

	const hasAnomalyFunction = functions.some((func) => func.name === 'anomaly');

	const handleAddNewFunction = (): void => {
		const defaultFunctionStruct =
			query.dataSource === DataSource.LOGS
				? defaultLogFunctionStruct
				: defaultMetricFunctionStruct;

		const updatedFunctionsArr = [
			...functions,
			{
				...defaultFunctionStruct,
			},
		];

		const functionsCopy = cloneDeep(updatedFunctionsArr);

		const anomalyFuncIndex = functionsCopy.findIndex(
			(func) => func.name === 'anomaly',
		);

		if (anomalyFuncIndex !== -1) {
			const anomalyFunc = functionsCopy[anomalyFuncIndex];

			functionsCopy.splice(anomalyFuncIndex, 1);
			functionsCopy.push(anomalyFunc);
		}

		setFunctions(functionsCopy);

		onChange(functionsCopy);
	};

	const handleDeleteFunction = (
		queryFunction: QueryFunctionProps,
		index: number,
	): void => {
		const clonedFunctions = cloneDeep(functions);
		pullAt(clonedFunctions, index);

		setFunctions(clonedFunctions);
		onChange(clonedFunctions);
	};

	const handleUpdateFunctionName = (
		func: QueryFunctionProps,
		index: number,
		value: string,
	): void => {
		const updateFunctions = cloneDeep(functions);

		if (updateFunctions && updateFunctions.length > 0 && updateFunctions[index]) {
			updateFunctions[index].name = value;
			setFunctions(updateFunctions);
			onChange(updateFunctions);
		}
	};

	const handleUpdateFunctionArgs = (
		func: QueryFunctionProps,
		index: number,
		value: string,
	): void => {
		const updateFunctions = cloneDeep(functions);

		if (updateFunctions && updateFunctions.length > 0 && updateFunctions[index]) {
			updateFunctions[index].args = [
				// timeShift expects a float64 value, so we convert the string to a number
				// For other functions, we keep the value as a string
				updateFunctions[index].name === QueryFunctionsTypes.TIME_SHIFT
					? toFloat64(value)
					: value,
			];
			setFunctions(updateFunctions);
			onChange(updateFunctions);
		}
	};

	return (
		<div
			className={cx(
				'query-functions-container',
				functions && functions.length > 0 ? 'hasFunctions' : '',
			)}
		>
			<Button className="periscope-btn function-btn">
				<FunctionIcon
					className="function-icon"
					fillColor={!isDarkMode ? '#0B0C0E' : 'white'}
				/>
			</Button>

			<div className="query-functions-list">
				{functions.map((func, index) => (
					<Function
						query={query}
						funcData={func}
						index={index}
						// eslint-disable-next-line react/no-array-index-key
						key={index}
						handleUpdateFunctionArgs={handleUpdateFunctionArgs}
						handleUpdateFunctionName={handleUpdateFunctionName}
						handleDeleteFunction={handleDeleteFunction}
					/>
				))}
			</div>

			<Tooltip
				title={
					functions && functions.length >= 3 ? (
						`Functions are in early access. You can add a maximum of ${
							hasAnomalyFunction ? 2 : 3
						} function as of now.`
					) : (
						<div style={{ textAlign: 'center' }}>
							Add new function
							<Typography.Link
								style={{ textDecoration: 'underline' }}
								href="https://signoz.io/docs/userguide/query-builder/?utm_source=product&utm_medium=query-builder#functions-for-extended-data-analysis"
								target="_blank"
							>
								{' '}
								<br />
								Learn more
							</Typography.Link>
						</div>
					)
				}
				placement="right"
			>
				<Button
					className="periscope-btn add-function-btn"
					disabled={functions && functions.length >= maxFunctions}
					onClick={handleAddNewFunction}
				>
					<Plus size={14} color={!isDarkMode ? '#0B0C0E' : 'white'} />
				</Button>
			</Tooltip>
		</div>
	);
}
