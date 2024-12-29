import { useMachine } from '@xstate/react';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { encode } from 'js-base64';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { whilelistedKeys } from './config';
import { ResourceContext } from './context';
import { ResourceAttributesFilterMachine } from './machine';
import {
	IResourceAttribute,
	IResourceAttributeProps,
	OptionsData,
} from './types';
import {
	createQuery,
	getResourceAttributeQueriesFromURL,
	GetTagKeys,
	GetTagValues,
	mappingWithRoutesAndKeys,
	OperatorSchema,
} from './utils';

function ResourceProvider({ children }: Props): JSX.Element {
	const { pathname } = useLocation();
	const [loading, setLoading] = useState(true);
	const [selectedQuery, setSelectedQueries] = useState<string[]>([]);
	const [staging, setStaging] = useState<string[]>([]);
	const [queries, setQueries] = useState<IResourceAttribute[]>(
		getResourceAttributeQueriesFromURL(),
	);
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();

	const [optionsData, setOptionsData] = useState<OptionsData>({
		mode: undefined,
		options: [],
	});

	// Watch for URL query changes
	useEffect(() => {
		const queriesFromUrl = getResourceAttributeQueriesFromURL();
		setQueries(queriesFromUrl);
	}, [urlQuery]);

	const handleLoading = (isLoading: boolean): void => {
		setLoading(isLoading);
		if (isLoading) {
			setOptionsData({ mode: undefined, options: [] });
		}
	};

	const dispatchQueries = useCallback(
		(queries: IResourceAttribute[]): void => {
			urlQuery.set(
				QueryParams.resourceAttributes,
				encode(JSON.stringify(queries)),
			);
			const generatedUrl = `${pathname}?${urlQuery.toString()}`;
			safeNavigate(generatedUrl);
			setQueries(queries);
		},
		[pathname, safeNavigate, urlQuery],
	);

	const [state, send] = useMachine(ResourceAttributesFilterMachine, {
		actions: {
			onSelectTagKey: () => {
				handleLoading(true);
				GetTagKeys()
					.then((tagKeys) => {
						const options = mappingWithRoutesAndKeys(pathname, tagKeys);

						setOptionsData({
							options,
							mode: undefined,
						});
					})
					.finally(() => {
						handleLoading(false);
					});
			},
			onSelectOperator: () => {
				setOptionsData({ options: OperatorSchema, mode: undefined });
			},
			onSelectTagValue: () => {
				handleLoading(true);

				GetTagValues(staging[0])
					.then((tagValuesOptions) =>
						setOptionsData({ options: tagValuesOptions, mode: 'multiple' }),
					)
					.finally(() => {
						handleLoading(false);
					});
			},
			onBlurPurge: () => {
				setSelectedQueries([]);
				setStaging([]);
			},
			onValidateQuery: (): void => {
				if (staging.length < 2 || selectedQuery.length === 0) {
					return;
				}

				const generatedQuery = createQuery([...staging, selectedQuery]);

				if (generatedQuery) {
					dispatchQueries([...queries, generatedQuery]);
				}
			},
		},
	});

	const handleFocus = useCallback((): void => {
		if (state.value === 'Idle') {
			send('NEXT');
		}
	}, [send, state.value]);

	const handleBlur = useCallback((): void => {
		send('onBlur');
	}, [send]);

	const handleChange = useCallback(
		(value: string): void => {
			if (!optionsData.mode) {
				setStaging((prevStaging) => [...prevStaging, value]);
				setSelectedQueries([]);
				send('NEXT');
				return;
			}

			setSelectedQueries([...value]);
		},
		[optionsData.mode, send],
	);

	const handleEnvironmentChange = useCallback(
		(environments: string[]): void => {
			const staging = ['resource_deployment_environment', 'IN'];

			const queriesCopy = queries.filter(
				(query) => query.tagKey !== 'resource_deployment_environment',
			);

			if (environments && Array.isArray(environments) && environments.length > 0) {
				const generatedQuery = createQuery([...staging, environments]);

				if (generatedQuery) {
					dispatchQueries([...queriesCopy, generatedQuery]);
				}
			} else {
				dispatchQueries([...queriesCopy]);
			}

			send('RESET');
		},
		[dispatchQueries, queries, send],
	);

	const handleClose = useCallback(
		(id: string): void => {
			dispatchQueries(queries.filter((queryData) => queryData.id !== id));
		},
		[dispatchQueries, queries],
	);

	const handleClearAll = useCallback(() => {
		send('RESET');
		dispatchQueries([]);
		setStaging([]);
		setQueries([]);
		setOptionsData({ mode: undefined, options: [] });
	}, [dispatchQueries, send]);

	const getVisibleQueries = useMemo(() => {
		if (pathname === ROUTES.SERVICE_MAP) {
			return queries.filter((query) => whilelistedKeys.includes(query.tagKey));
		}
		return queries;
	}, [queries, pathname]);

	const value: IResourceAttributeProps = useMemo(
		() => ({
			queries: getVisibleQueries,
			staging,
			handleClearAll,
			handleClose,
			handleBlur,
			handleFocus,
			loading,
			handleChange,
			handleEnvironmentChange,
			selectedQuery,
			optionsData,
		}),
		[
			handleBlur,
			handleChange,
			handleEnvironmentChange,
			handleClearAll,
			handleClose,
			handleFocus,
			loading,
			staging,
			selectedQuery,
			optionsData,
			getVisibleQueries,
		],
	);

	return (
		<ResourceContext.Provider value={value}>{children}</ResourceContext.Provider>
	);
}

interface Props {
	children: ReactNode;
}

export default ResourceProvider;
