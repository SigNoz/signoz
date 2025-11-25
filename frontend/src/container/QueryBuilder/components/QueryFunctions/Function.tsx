/* eslint-disable react/jsx-props-no-spreading */
import { Button, Flex, InputRef, Select } from 'antd';
import cx from 'classnames';
import OverflowInputToolTip from 'components/OverflowInputToolTip';
import {
	logsQueryFunctionOptions,
	metricQueryFunctionOptions,
	queryFunctionsTypesConfig,
} from 'constants/queryFunctionOptions';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { debounce, isNil } from 'lodash-es';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { QueryFunction } from 'types/api/v5/queryRange';
import { DataSource, QueryFunctionsTypes } from 'types/common/queryBuilder';
import { normalizeFunctionName } from 'utils/functionNameNormalizer';

interface FunctionProps {
	query: IBuilderQuery;
	funcData: QueryFunction;
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
	// Normalize function name to handle backend response case sensitivity
	const normalizedFunctionName = normalizeFunctionName(funcData.name);
	const { showInput, disabled } = queryFunctionsTypesConfig[
		normalizedFunctionName
	];

	let functionValue;

	const hasValue = !isNil(funcData.args?.[0]?.value);

	if (hasValue) {
		// eslint-disable-next-line prefer-destructuring
		functionValue = funcData.args?.[0]?.value;
	}

	const [value, setValue] = useState<string>(
		functionValue !== undefined ? String(functionValue) : '',
	);
	const inputRef = useRef<InputRef>(null);
	const mirrorRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (!mirrorRef.current || !inputRef.current?.input) return;

		const mirrorWidth = mirrorRef.current.offsetWidth + 24; // padding
		const newWidth = Math.min(150, Math.max(70, mirrorWidth));

		// AntD input actual DOM element is inputRef.current.input
		inputRef.current.input.style.width = `${newWidth}px`;
	}, [value]);

	const debouncedhandleUpdateFunctionArgs = debounce(
		handleUpdateFunctionArgs,
		500,
	);

	// update the logic when we start supporting functions for traces
	const functionOptions =
		query.dataSource === DataSource.LOGS
			? logsQueryFunctionOptions
			: metricQueryFunctionOptions;

	const disableRemoveFunction =
		normalizedFunctionName === QueryFunctionsTypes.ANOMALY;

	if (normalizedFunctionName === QueryFunctionsTypes.ANOMALY) {
		// eslint-disable-next-line react/jsx-no-useless-fragment
		return <></>;
	}

	return (
		<Flex className="query-function">
			<Select
				className={cx('query-function-name-selector', showInput ? 'showInput' : '')}
				value={normalizedFunctionName}
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
				<>
					<OverflowInputToolTip
						ref={inputRef}
						className="query-function-value"
						autoFocus
						value={value}
						onChange={(event): void => {
							const newVal = event.target.value;
							setValue(newVal);
							debouncedhandleUpdateFunctionArgs(funcData, index, event.target.value);
						}}
						tooltipPlacement="top"
						style={{
							width: 70,
							minWidth: 70,
							maxWidth: 150,
						}}
					/>
					<span
						ref={mirrorRef}
						style={{
							position: 'absolute',
							visibility: 'hidden',
							whiteSpace: 'pre',
							fontSize: '14px',
							fontFamily: 'inherit',
							fontWeight: 'normal',
						}}
					>
						{value || ' '}
					</span>
				</>
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
