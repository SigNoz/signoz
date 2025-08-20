import {
	HandleChangeTraceOperatorData,
	UseTraceOperatorOperations,
} from 'types/common/operations.types';
import { useQueryBuilder } from './useQueryBuilder';
import { useCallback } from 'react';
import { LEGEND } from 'constants/global';
import { getFormatedLegend } from 'utils/getFormatedLegend';

export const useTraceOperatorOperations: UseTraceOperatorOperations = ({
	index = 0,
	query,
}) => {
	const {
		handleSetTraceOperatorData,
		addTraceOperator,
		currentQuery,
	} = useQueryBuilder();

	const handleChangeTraceOperatorData: HandleChangeTraceOperatorData = useCallback(
		(key, value) => {
			if (!query) {
				addTraceOperator('');
			}
			const updatedQuery = query
				? query
				: currentQuery.builder.queryTraceOperator[0];

			const newQuery = {
				...updatedQuery,
				[key]:
					key === LEGEND && typeof value === 'string'
						? getFormatedLegend(value)
						: value,
			};

			handleSetTraceOperatorData(index, newQuery);
		},
		[handleSetTraceOperatorData, index, query],
	);

	return {
		handleChangeTraceOperatorData,
	};
};
