/* eslint-disable react/jsx-props-no-spreading */

import { Button, Flex, Select } from 'antd';
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
import { useMemo, useState } from 'react';
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
	handleOpenFunctionsSearchModal: () => void;
}

export default function Function({
	query,
	funcData,
	index,
	handleUpdateFunctionArgs,
	handleUpdateFunctionName,
	handleDeleteFunction,
	handleOpenFunctionsSearchModal,
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

	const debouncedhandleUpdateFunctionArgs = useMemo(
		() => debounce(handleUpdateFunctionArgs, 500),
		[handleUpdateFunctionArgs],
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
			<Button onClick={handleOpenFunctionsSearchModal}>
				{normalizedFunctionName}
			</Button>

			{showInput && (
				<OverflowInputToolTip
					autoFocus
					value={value}
					onChange={(event): void => {
						const newVal = event.target.value;
						setValue(newVal);
						debouncedhandleUpdateFunctionArgs(funcData, index, event.target.value);
					}}
					tooltipPlacement="top"
					minAutoWidth={70}
					maxAutoWidth={150}
					className="query-function-value"
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
