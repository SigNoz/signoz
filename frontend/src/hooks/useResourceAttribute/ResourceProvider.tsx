import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { encode } from 'js-base64';

import { FeatureKeys } from '../../constants/features';
import { useAppContext } from '../../providers/App/App';
import { whilelistedKeys } from './config';
import { ResourceContext } from './context';
import {
	IResourceAttribute,
	IResourceAttributeProps,
	OptionsData,
} from './types';
import {
	createQuery,
	getResourceAttributeQueriesFromURL,
	getResourceDeploymentKeys,
	GetTagKeys,
	GetTagValues,
	mappingWithRoutesAndKeys,
	OperatorSchema,
} from './utils';

type ResourceStep = 'Idle' | 'TagKey' | 'Operator' | 'TagValue';
type ResourceEvent = 'NEXT' | 'onBlur' | 'RESET';

function ResourceProvider({ children }: Props): JSX.Element {
	const { pathname } = useLocation();
	const [loading, setLoading] = useState(true);
	const [selectedQuery, setSelectedQueries] = useState<string[]>([]);
	const [staging, setStaging] = useState<string[]>([]);
	const [queries, setQueries] = useState<IResourceAttribute[]>(
		getResourceAttributeQueriesFromURL(),
	);
	const [step, setStep] = useState<ResourceStep>('Idle');
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

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

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

	const loadTagKeys = (): void => {
		handleLoading(true);
		GetTagKeys(dotMetricsEnabled)
			.then((tagKeys) => {
				const options = mappingWithRoutesAndKeys(pathname, tagKeys);
				setOptionsData({ options, mode: undefined });
			})
			.finally(() => {
				handleLoading(false);
			});
	};

	const loadTagValues = (): void => {
		handleLoading(true);
		GetTagValues(staging[0])
			.then((tagValuesOptions) =>
				setOptionsData({ options: tagValuesOptions, mode: 'multiple' }),
			)
			.finally(() => {
				handleLoading(false);
			});
	};

	const handleNext = (): void => {
		if (step === 'Idle') {
			loadTagKeys();
			setStep('TagKey');
		} else if (step === 'TagKey') {
			setOptionsData({ options: OperatorSchema, mode: undefined });
			setStep('Operator');
		} else if (step === 'Operator') {
			loadTagValues();
			setStep('TagValue');
		}
	};

	const handleOnBlur = (): void => {
		if (step === 'TagValue' && staging.length >= 2 && selectedQuery.length > 0) {
			const generatedQuery = createQuery([...staging, selectedQuery]);
			if (generatedQuery) {
				dispatchQueries([...queries, generatedQuery]);
			}
		}
		if (step !== 'Idle') {
			setSelectedQueries([]);
			setStaging([]);
			setStep('Idle');
		}
	};

	const send = (event: ResourceEvent): void => {
		if (event === 'RESET') {
			setStep('Idle');
			return;
		}
		if (event === 'NEXT') {
			handleNext();
			return;
		}
		if (event === 'onBlur') {
			handleOnBlur();
		}
	};

	const handleFocus = useCallback((): void => {
		if (step === 'Idle') {
			send('NEXT');
		}
	}, [step]);

	const handleBlur = useCallback((): void => {
		send('onBlur');
	}, [step, staging, selectedQuery, queries, dispatchQueries]);

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
		[optionsData.mode, step, staging, dotMetricsEnabled, pathname],
	);

	const handleEnvironmentChange = useCallback(
		(environments: string[]): void => {
			const staging = [getResourceDeploymentKeys(dotMetricsEnabled), 'IN'];

			const queriesCopy = queries.filter(
				(query) => query.tagKey !== getResourceDeploymentKeys(dotMetricsEnabled),
			);

			if (environments && Array.isArray(environments) && environments.length > 0) {
				const generatedQuery = createQuery([...staging, environments]);

				if (generatedQuery) {
					dispatchQueries([...queriesCopy, generatedQuery]);
				}
			} else {
				dispatchQueries([...queriesCopy]);
			}

			setStep('Idle');
		},
		[dispatchQueries, dotMetricsEnabled, queries],
	);

	const handleClose = useCallback(
		(id: string): void => {
			dispatchQueries(queries.filter((queryData) => queryData.id !== id));
		},
		[dispatchQueries, queries],
	);

	const handleClearAll = useCallback(() => {
		setStep('Idle');
		dispatchQueries([]);
		setStaging([]);
		setQueries([]);
		setOptionsData({ mode: undefined, options: [] });
	}, [dispatchQueries]);

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
