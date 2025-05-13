import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

interface LocalStoreDashboardVariables {
	[id: string]: {
		selectedValue: IDashboardVariable['selectedValue'];
		allSelected: boolean;
	};
}

interface UseVariablesFromUrlReturn {
	getUrlVariables: () => LocalStoreDashboardVariables;
	setUrlVariables: (variables: LocalStoreDashboardVariables) => void;
	updateUrlVariable: (
		id: string,
		selectedValue: IDashboardVariable['selectedValue'],
		allSelected: boolean,
	) => void;
	clearUrlVariables: () => void;
}

const useVariablesFromUrl = (): UseVariablesFromUrlReturn => {
	const urlQuery = useUrlQuery();
	const history = useHistory();

	const getUrlVariables = useCallback((): LocalStoreDashboardVariables => {
		const variableConfigsParam = urlQuery.get(QueryParams.variableConfigs);

		if (!variableConfigsParam) {
			return {};
		}

		try {
			return JSON.parse(decodeURIComponent(variableConfigsParam));
		} catch (error) {
			console.error('Failed to parse variables from URL:', error);
			return {};
		}
	}, [urlQuery]);

	const setUrlVariables = useCallback(
		(variables: LocalStoreDashboardVariables): void => {
			const params = new URLSearchParams(urlQuery.toString());

			if (Object.keys(variables).length === 0) {
				params.delete(QueryParams.variableConfigs);
			} else {
				try {
					const encodedVariables = encodeURIComponent(JSON.stringify(variables));
					params.set(QueryParams.variableConfigs, encodedVariables);
				} catch (error) {
					console.error('Failed to serialize variables for URL:', error);
				}
			}

			history.replace({
				search: params.toString(),
			});
		},
		[history, urlQuery],
	);

	const clearUrlVariables = useCallback((): void => {
		const params = new URLSearchParams(urlQuery.toString());
		params.delete(QueryParams.variableConfigs);

		history.replace({
			search: params.toString(),
		});
	}, [history, urlQuery]);

	const updateUrlVariable = useCallback(
		(
			id: string,
			selectedValue: IDashboardVariable['selectedValue'],
			allSelected: boolean,
		): void => {
			const currentVariables = getUrlVariables();

			const updatedVariables = {
				...currentVariables,
				[id]: { selectedValue, allSelected },
			};

			setUrlVariables(updatedVariables);
		},
		[getUrlVariables, setUrlVariables],
	);

	return {
		getUrlVariables,
		setUrlVariables,
		updateUrlVariable,
		clearUrlVariables,
	};
};

export default useVariablesFromUrl;
