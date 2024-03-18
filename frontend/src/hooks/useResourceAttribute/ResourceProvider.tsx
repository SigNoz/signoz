import { useMachine } from '@xstate/react';
import ROUTES from 'constants/routes';
import { encode } from 'js-base64';
import history from 'lib/history';
import { ReactNode, useCallback, useMemo, useState } from 'react';
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

	const [optionsData, setOptionsData] = useState<OptionsData>({
		mode: undefined,
		options: [],
	});

	const handleLoading = (isLoading: boolean): void => {
		setLoading(isLoading);
		if (isLoading) {
			setOptionsData({ mode: undefined, options: [] });
		}
	};

	const dispatchQueries = useCallback(
		(queries: IResourceAttribute[]): void => {
			history.replace({
				pathname,
				search:
					queries && queries.length
						? `?resourceAttribute=${encode(JSON.stringify(queries))}`
						: '',
			});

			console.log('queries', queries, pathname);
			setQueries(queries);
		},
		[pathname],
	);

	console.log('pathname', pathname);

	const [state, send] = useMachine(ResourceAttributesFilterMachine, {
		actions: {
			onSelectTagKey: () => {
				handleLoading(true);
				GetTagKeys()
					.then((tagKeys) => {
						const options = mappingWithRoutesAndKeys(pathname, tagKeys);

						console.log('options', options);

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
				console.log('on blur purge');
				setSelectedQueries([]);
				setStaging([]);
			},
			onValidateQuery: (): void => {
				console.log('validate Query');

				if (staging.length < 2 || selectedQuery.length === 0) {
					return;
				}

				console.log('staging', staging, selectedQuery);

				const generatedQuery = createQuery([...staging, selectedQuery]);

				console.log('generatedQuery', generatedQuery);
				if (generatedQuery) {
					dispatchQueries([...queries, generatedQuery]);
				}
			},
		},
	});

	const handleFocus = useCallback((): void => {
		console.log('handleFocus, state.value', state.value);
		if (state.value === 'Idle') {
			send('NEXT');
		}
	}, [send, state.value]);

	const handleEnvironmentSelectorFocus = useCallback((): void => {
		console.log('handleEnvironmentSelectorFocus - state.value', state.value);

		if (state.value === 'Idle') {
			send('ENV_SELECT');
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

			console.log('optionsData.mode', optionsData.mode);

			setSelectedQueries([...value]);
		},
		[optionsData.mode, send],
	);

	const handleEnvironmentChange = useCallback(
		(value: string): void => {
			const staging = ['resource_deployment_environment', 'IN'];

			const queriesCopy = queries.filter(
				(query) => query.tagKey !== 'resource_deployment_environment',
			);

			if (value && Array.isArray(value) && value.length > 0) {
				const generatedQuery = createQuery([...staging, value]);

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
			console.log('handle close', id);

			dispatchQueries(queries.filter((queryData) => queryData.id !== id));
		},
		[dispatchQueries, queries],
	);

	console.log('queries', queries);

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
			handleEnvironmentSelectorFocus,
			selectedQuery,
			optionsData,
		}),
		[
			handleBlur,
			handleChange,
			handleEnvironmentChange,
			handleEnvironmentSelectorFocus,
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
