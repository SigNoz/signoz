/* eslint-disable react/jsx-props-no-spreading */
import { Button, Flex, Input, Select } from 'antd';
import cx from 'classnames';
import {
	logsQueryFunctionOptions,
	metricQueryFunctionOptions,
	queryFunctionsTypesConfig,
} from 'constants/queryFunctionOptions';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { debounce, isNil } from 'lodash-es';
import { X } from 'lucide-react';
import {
	IBuilderQuery,
	QueryFunctionProps,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource, QueryFunctionsTypes } from 'types/common/queryBuilder';

interface FunctionProps {
	query: IBuilderQuery;
	funcData: QueryFunctionProps;
	index: any;
	handleUpdateFunctionArgs: any;
	handleUpdateFunctionName: any;
	handleDeleteFunction: any;
}

export default function Function({
	query,
	funcData,
	index,
	handleUpdateFunctionArgs,
	handleUpdateFunctionName,
	handleDeleteFunction,
}: FunctionProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const { showInput, disabled } = queryFunctionsTypesConfig[funcData.name];

	let functionValue;

	const hasValue = !isNil(
		funcData.args && funcData.args.length > 0 && funcData.args[0],
	);

	if (hasValue) {
		// eslint-disable-next-line prefer-destructuring
		functionValue = funcData.args[0];
	}

	const debouncedhandleUpdateFunctionArgs = debounce(
		handleUpdateFunctionArgs,
		500,
	);

	// update the logic when we start supporting functions for traces
	const functionOptions =
		query.dataSource === DataSource.LOGS
			? logsQueryFunctionOptions
			: metricQueryFunctionOptions;

	const disableRemoveFunction = funcData.name === QueryFunctionsTypes.ANOMALY;

	if (funcData.name === QueryFunctionsTypes.ANOMALY) {
		// eslint-disable-next-line react/jsx-no-useless-fragment
		return <></>;
	}

	return (
		<Flex className="query-function">
			<Select
				className={cx('query-function-name-selector', showInput ? 'showInput' : '')}
				value={funcData.name}
				disabled={disabled}
				style={{ minWidth: '100px' }}
				onChange={(value): void => {
					handleUpdateFunctionName(funcData, index, value);
				}}
				dropdownStyle={{
					minWidth: 200,
					borderRadius: '4px',
					border: isDarkMode
						? '1px solid var(--bg-slate-400)'
						: '1px solid var(--bg-vanilla-300)',
					boxShadow: `4px 10px 16px 2px rgba(0, 0, 0, 0.20)`,
				}}
				placement="bottomRight"
				options={functionOptions}
			/>

			{showInput && (
				<Input
					className="query-function-value"
					autoFocus
					defaultValue={functionValue}
					onChange={(event): void => {
						debouncedhandleUpdateFunctionArgs(funcData, index, event.target.value);
					}}
				/>
			)}

			<Button
				className="periscope-btn query-function-delete-btn"
				disabled={disableRemoveFunction}
				onClick={(): void => {
					handleDeleteFunction(funcData, index);
				}}
			>
				<X size={12} />
			</Button>
		</Flex>
	);
}
