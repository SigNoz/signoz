import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Copy, X } from '@signozhq/icons';
import { Divider } from '@signozhq/ui/divider';
import { Button } from '@signozhq/ui/button';
import { DrawerWrapper, DrawerWrapperProps } from '@signozhq/ui/drawer';
import { toast } from '@signozhq/ui/sonner';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { useCopyToClipboard } from 'hooks/useCopyToClipboard';
import logEvent from 'api/common/logEvent';
import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import APIError from 'types/api/error';
import { InfraMonitoringEvents } from 'constants/events';
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

import styles from '../EntityDetailsUtils/entityDetails.module.scss';
import { INFRA_MONITORING_DETAILS_CACHE_TIME } from 'constants/queryCacheTime';

export type {
	CustomTab,
	CustomTabRenderProps,
	K8sBaseDetailsProps,
	K8sDetailsCountConfig,
	K8sDetailsFilters,
	K8sDetailsMetadataConfig,
} from './types';

// TODO(H4ad): Improve this on component level
const DRAWER_TRANSITION = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] };
const DRAWER_MOTION_PROPS = {
	onOpenAutoFocus: (e: Event): void => e.preventDefault(),
	initial: { opacity: 0, transform: 'translateX(100%)' },
	animate: {
		opacity: 1,
		transform: 'translateX(0%)',
		transition: DRAWER_TRANSITION,
	},
	exit: {
		opacity: 0,
		transform: 'translateX(100%)',
		transition: DRAWER_TRANSITION,
	},
} as unknown as DrawerWrapperProps['drawerContentProps'];

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
		cacheTime: INFRA_MONITORING_DETAILS_CACHE_TIME,
		staleTime: INFRA_MONITORING_DETAILS_CACHE_TIME,
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

	const handleOpenChange = useCallback(
		(open: boolean): void => {
			if (!open) {
				handleClose();
			}
		},
		[handleClose],
	);

	const { copyToClipboard } = useCopyToClipboard();

	const handleCopyId = useCallback((): void => {
		if (selectedItem) {
			copyToClipboard(selectedItem);
			toast.success('ID copied to clipboard', { position: 'bottom-left' });
		}
	}, [copyToClipboard, selectedItem]);

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

	// TODO(H4ad): Improve this on component level
	// DrawerWrapper types `title` as string but renders any ReactNode.
	const drawerTitle = (
		<>
			<Button
				variant="ghost"
				size="sm"
				color="secondary"
				onClick={handleClose}
				data-testid="close-drawer-button"
				className={styles.closeButton}
				prefix={<X />}
			/>
			<Divider type="vertical" />
			<Typography.Text className={styles.title}>
				{entityName ||
					((isEntityError || hasResponseError) && 'Failed to load entity details') ||
					(isEntityLoading && 'Loading...') ||
					'-'}
			</Typography.Text>
			<TooltipSimple title="Copy ID">
				<Button
					variant="ghost"
					size="sm"
					color="secondary"
					onClick={handleCopyId}
					data-testid="copy-id-button"
				>
					<Copy size={14} />
				</Button>
			</TooltipSimple>
		</>
	) as unknown as string;

	return (
		<DrawerWrapper
			open={!!selectedItem}
			onOpenChange={handleOpenChange}
			direction="right"
			title={drawerTitle}
			showCloseButton={false}
			drawerContentProps={DRAWER_MOTION_PROPS}
			className={styles.entityDetailDrawer}
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
		</DrawerWrapper>
	);
}
