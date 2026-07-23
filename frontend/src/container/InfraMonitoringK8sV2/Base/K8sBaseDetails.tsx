import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Color, Spacing } from '@signozhq/design-tokens';
import { X } from '@signozhq/icons';
import { Divider } from '@signozhq/ui/divider';
import { Typography } from '@signozhq/ui/typography';
import { Drawer } from 'antd';
import logEvent from 'api/common/logEvent';
import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import APIError from 'types/api/error';
import { InfraMonitoringEvents } from 'constants/events';
import { useIsDarkMode } from 'hooks/useDarkMode';
import {
	GlobalTimeProvider,
	NANO_SECOND_MULTIPLIER,
	useGlobalTimeStore,
} from 'store/globalTime';

import { INFRA_MONITORING_K8S_PARAMS_KEYS } from '../constants';
import { useInfraMonitoringSelectedItemParams } from '../hooks';
import LoadingContainer from '../LoadingContainer';

import K8sBaseDetailsContent from './K8sBaseDetailsContent';
import { K8sBaseDetailsProps } from './types';

import '../EntityDetailsUtils/entityDetails.styles.scss';

export type {
	CustomTab,
	CustomTabRenderProps,
	K8sBaseDetailsProps,
	K8sDetailsCountConfig,
	K8sDetailsFilters,
	K8sDetailsMetadataConfig,
} from './types';

export default function K8sBaseDetails<T>({
	category,
	eventCategory,
	getSelectedItemExpression,
	fetchEntityData,
	getEntityName,
	getInitialLogTracesExpression,
	getInitialEventsExpression,
	metadataConfig,
	countsConfig,
	getCountsFilterExpression,
	entityWidgetInfo,
	getEntityQueryPayload,
	queryKeyPrefix,
	hideDetailViewTabs = false,
	tabsConfig,
	customTabs,
}: K8sBaseDetailsProps<T>): JSX.Element {
	const selectedTime = useGlobalTimeStore((s) => s.selectedTime);
	const getMinMaxTime = useGlobalTimeStore((s) => s.getMinMaxTime);
	const getAutoRefreshQueryKey = useGlobalTimeStore(
		(s) => s.getAutoRefreshQueryKey,
	);

	const isDarkMode = useIsDarkMode();

	const [selectedItemParams, setSelectedItemParams] =
		useInfraMonitoringSelectedItemParams();
	const selectedItem = selectedItemParams.selectedItem;

	const entityQueryKey = useMemo(
		() =>
			getAutoRefreshQueryKey(
				selectedTime,
				`${queryKeyPrefix}EntityDetails`,
				selectedItem,
				selectedItemParams.clusterName,
				selectedItemParams.namespaceName,
			),
		[
			queryKeyPrefix,
			selectedItem,
			selectedItemParams.clusterName,
			selectedItemParams.namespaceName,
			selectedTime,
			getAutoRefreshQueryKey,
		],
	);

	const {
		data: entityResponse,
		isLoading: isEntityLoading,
		isError: isEntityError,
		error: entityError,
	} = useQuery({
		queryKey: entityQueryKey,
		queryFn: ({ signal }) => {
			if (!selectedItem) {
				return { data: null };
			}
			const { minTime, maxTime } = getMinMaxTime();
			const start = Math.floor(minTime / NANO_SECOND_MULTIPLIER);
			const end = Math.floor(maxTime / NANO_SECOND_MULTIPLIER);
			const expression = getSelectedItemExpression(selectedItemParams);

			return fetchEntityData({ filter: { expression }, start, end }, signal);
		},
		enabled: !!selectedItem,
	});

	const entity = entityResponse?.data ?? null;
	const hasResponseError = !!entityResponse?.error;

	const logsAndTracesInitialExpression = useMemo(() => {
		if (!entity) {
			return '';
		}
		return getInitialLogTracesExpression(entity);
	}, [entity, getInitialLogTracesExpression]);

	const eventsInitialExpression = useMemo(() => {
		if (!entity) {
			return '';
		}
		return getInitialEventsExpression(entity);
	}, [entity, getInitialEventsExpression]);

	const handleClose = useCallback((): void => {
		setSelectedItemParams(null);
	}, [setSelectedItemParams]);

	const entityName = entity ? getEntityName(entity) : '';

	useEffect(() => {
		if (entity) {
			void logEvent(InfraMonitoringEvents.PageVisited, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.DetailedPage,
				category: eventCategory,
			});
		}
	}, [entity, eventCategory]);

	return (
		<Drawer
			width="70%"
			title={
				<>
					<Divider type="vertical" />
					<Typography.Text className="title">
						{entityName ||
							((isEntityError || hasResponseError) &&
								'Failed to load entity details') ||
							(isEntityLoading && 'Loading...') ||
							'-'}
					</Typography.Text>
				</>
			}
			placement="right"
			onClose={handleClose}
			open={!!selectedItem}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="entity-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{(isEntityLoading || !selectedItem) && <LoadingContainer />}

			{selectedItem && (isEntityError || hasResponseError) && (
				<div className="entity-error-container">
					<ErrorContent
						error={
							entityResponse?.error ??
							(entityError instanceof APIError ? entityError : null) ?? {
								code: 500,
								message:
									entityError instanceof Error
										? entityError.message
										: 'Failed to load entity details',
							}
						}
					/>
				</div>
			)}
			{selectedItem && entity && !isEntityLoading && !hasResponseError && (
				<GlobalTimeProvider
					inheritGlobalTime
					enableUrlParams={{
						relativeTimeKey: INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_RELATIVE_TIME,
						startTimeKey: INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_START_TIME,
						endTimeKey: INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_END_TIME,
					}}
				>
					<K8sBaseDetailsContent<T>
						entity={entity}
						category={category}
						eventCategory={eventCategory}
						metadataConfig={metadataConfig}
						countsConfig={countsConfig}
						getCountsFilterExpression={getCountsFilterExpression}
						selectedItem={selectedItem}
						handleClose={handleClose}
						entityWidgetInfo={entityWidgetInfo}
						getEntityQueryPayload={getEntityQueryPayload}
						queryKeyPrefix={queryKeyPrefix}
						hideDetailViewTabs={hideDetailViewTabs}
						tabsConfig={tabsConfig}
						customTabs={customTabs}
						logsAndTracesInitialExpression={logsAndTracesInitialExpression}
						eventsInitialExpression={eventsInitialExpression}
					/>
				</GlobalTimeProvider>
			)}
		</Drawer>
	);
}
