import { useMachine } from '@xstate/react';
import { encode } from 'js-base64';
import history from 'lib/history';
import React, { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

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
			setQueries(queries);
		},
		[pathname],
	);

	const [state, send] = useMachine(ResourceAttributesFilterMachine, {
		actions: {
			onSelectTagKey: () => {
				handleLoading(true);
				GetTagKeys()
					.then((tagKeys) => setOptionsData({ options: tagKeys, mode: undefined }))
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

	const value: IResourceAttributeProps = useMemo(
		() => ({
			queries,
			staging,
			handleClearAll,
			handleClose,
			handleBlur,
			handleFocus,
			loading,
			handleChange,
			selectedQuery,
			optionsData,
		}),
		[
			handleBlur,
			handleChange,
			handleClearAll,
			handleClose,
			handleFocus,
			loading,
			queries,
			staging,
			selectedQuery,
			optionsData,
		],
	);

	return (
		<ResourceContext.Provider value={value}>{children}</ResourceContext.Provider>
	);
}

interface Props {
	children: React.ReactNode;
}

export default ResourceProvider;
