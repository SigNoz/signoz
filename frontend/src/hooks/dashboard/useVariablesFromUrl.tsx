import * as Sentry from '@sentry/react';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

export interface LocalStoreDashboardVariables {
	[name: string]:
		| IDashboardVariable['selectedValue'][]
		| IDashboardVariable['selectedValue'];
}

interface UseVariablesFromUrlReturn {
	getUrlVariables: () => LocalStoreDashboardVariables;
	setUrlVariables: (variables: LocalStoreDashboardVariables) => void;
	updateUrlVariable: (
		name: string,
		selectedValue: IDashboardVariable['selectedValue'],
	) => void;
}

const useVariablesFromUrl = (): UseVariablesFromUrlReturn => {
	const urlQuery = useUrlQuery();
	const history = useHistory();

	const getUrlVariables = useCallback((): LocalStoreDashboardVariables => {
		const variablesParam = urlQuery.get(QueryParams.variables);

		if (!variablesParam) {
			return {};
		}

		try {
			return JSON.parse(decodeURIComponent(variablesParam));
		} catch (error) {
			Sentry.captureEvent({
				message: `Failed to parse dashboard variables from URL: ${error}`,
				level: 'error',
			});
			return {};
		}
	}, [urlQuery]);

	const setUrlVariables = useCallback(
		(variables: LocalStoreDashboardVariables): void => {
			const params = new URLSearchParams(urlQuery.toString());

			if (Object.keys(variables).length === 0) {
				params.delete(QueryParams.variables);
			} else {
				try {
					const encodedVariables = encodeURIComponent(JSON.stringify(variables));
					params.set(QueryParams.variables, encodedVariables);
				} catch (error) {
					Sentry.captureEvent({
						message: `Failed to serialize dashboard variables for URL: ${error}`,
						level: 'error',
					});
				}
			}

			history.replace({
				search: params.toString(),
			});
		},
		[history, urlQuery],
	);

	const updateUrlVariable = useCallback(
		(name: string, selectedValue: IDashboardVariable['selectedValue']): void => {
			const currentVariables = getUrlVariables();

			const updatedVariables = {
				...currentVariables,
				[name]: selectedValue,
			};

			setUrlVariables(updatedVariables as LocalStoreDashboardVariables);
		},
		[getUrlVariables, setUrlVariables],
	);

	return {
		getUrlVariables,
		setUrlVariables,
		updateUrlVariable,
	};
};

export default useVariablesFromUrl;
