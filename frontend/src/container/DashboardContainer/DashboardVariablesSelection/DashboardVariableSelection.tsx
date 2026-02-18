import { memo, useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Row } from 'antd';
import { ALL_SELECTED_VALUE } from 'components/NewSelect/utils';
import {
	useDashboardVariables,
	useDashboardVariablesSelector,
} from 'hooks/dashboard/useDashboardVariables';
import useVariablesFromUrl from 'hooks/dashboard/useVariablesFromUrl';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { initializeDefaultVariables } from 'providers/Dashboard/initializeDefaultVariables';
import {
	enqueueDescendantsOfVariable,
	enqueueFetchOfAllVariables,
	initializeVariableFetchStore,
} from 'providers/Dashboard/store/variableFetchStore';
import { AppState } from 'store/reducers';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

import VariableItem from './VariableItem';

import './DashboardVariableSelection.styles.scss';

function DashboardVariableSelection(): JSX.Element | null {
	const {
		setSelectedDashboard,
		updateLocalStorageDashboardVariables,
	} = useDashboard();

	const { updateUrlVariable, getUrlVariables } = useVariablesFromUrl();

	const { dashboardVariables } = useDashboardVariables();
	const sortedVariablesArray = useDashboardVariablesSelector(
		(state) => state.sortedVariablesArray,
	);
	const dependencyData = useDashboardVariablesSelector(
		(state) => state.dependencyData,
	);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	useEffect(() => {
		// Initialize variables with default values if not in URL
		initializeDefaultVariables(
			dashboardVariables,
			getUrlVariables,
			updateUrlVariable,
		);
	}, [getUrlVariables, updateUrlVariable, dashboardVariables]);

	// Memoize the order key to avoid unnecessary triggers
	const dependencyOrderKey = useMemo(
		() => dependencyData?.order?.join(',') ?? '',
		[dependencyData?.order],
	);

	// Initialize fetch store then start a new fetch cycle.
	// Runs on dependency order changes, and time range changes.
	useEffect(() => {
		const allVariableNames = sortedVariablesArray
			.map((v) => v.name)
			.filter((name): name is string => !!name);
		initializeVariableFetchStore(allVariableNames);
		enqueueFetchOfAllVariables();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dependencyOrderKey, minTime, maxTime]);

	// Performance optimization: For dynamic variables with allSelected=true, we don't store
	// individual values in localStorage since we can always derive them from available options.
	// This makes localStorage much lighter and more efficient.
	const onValueUpdate = useCallback(
		(
			name: string,
			id: string,
			value: IDashboardVariable['selectedValue'],
			allSelected: boolean,
			haveCustomValuesSelected?: boolean,
			// eslint-disable-next-line sonarjs/cognitive-complexity
		): void => {
			// For dynamic variables, only store in localStorage when NOT allSelected
			// This makes localStorage much lighter by avoiding storing all individual values
			const variable = dashboardVariables[id] || dashboardVariables[name];
			const isDynamic = variable.type === 'DYNAMIC';
			updateLocalStorageDashboardVariables(name, value, allSelected, isDynamic);

			if (allSelected) {
				updateUrlVariable(name || id, ALL_SELECTED_VALUE);
			} else {
				updateUrlVariable(name || id, value);
			}

			setSelectedDashboard((prev) => {
				if (prev) {
					const oldVariables = { ...prev?.data.variables };
					// this is added to handle case where we have two different
					// schemas for variable response
					if (oldVariables?.[id]) {
						oldVariables[id] = {
							...oldVariables[id],
							selectedValue: value,
							allSelected,
							haveCustomValuesSelected,
						};
					}
					if (oldVariables?.[name]) {
						oldVariables[name] = {
							...oldVariables[name],
							selectedValue: value,
							allSelected,
							haveCustomValuesSelected,
						};
					}
					return {
						...prev,
						data: {
							...prev?.data,
							variables: {
								...oldVariables,
							},
						},
					};
				}
				return prev;
			});

			// Cascade: enqueue query-type descendants for refetching
			enqueueDescendantsOfVariable(name);
		},
		[
			dashboardVariables,
			updateLocalStorageDashboardVariables,
			updateUrlVariable,
			setSelectedDashboard,
		],
	);

	return (
		<Row className="dashboard-variables-selection-container">
			{sortedVariablesArray.map((variable) => {
				const key = `${variable.name}${variable.id}${variable.order}`;

				return (
					<VariableItem
						key={key}
						existingVariables={dashboardVariables}
						variableData={variable}
						onValueUpdate={onValueUpdate}
					/>
				);
			})}
		</Row>
	);
}

export default memo(DashboardVariableSelection);
