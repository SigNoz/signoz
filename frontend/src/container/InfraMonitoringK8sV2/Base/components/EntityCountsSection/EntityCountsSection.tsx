import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { Compass } from '@signozhq/icons';
import { TextNoData } from '../../../components/TextNoData';
import { logInfraExplorerNavigatedEvent } from 'constants/events';
import { QueryParams } from 'constants/query';
import { initialQueriesMap } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import {
	applySerializedParams,
	serialize,
} from 'lib/compositeQuery/serializer';
import { Link } from 'react-router-dom';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from '../../../constants';
import { getDrawerDurationMs } from '../../useDrawerLifecycleStore';
import styles from './EntityCountsSection.module.scss';

export interface EntityCountConfig<T> {
	label: string;
	getValue: (entity: T) => number;
	targetCategory: InfraMonitoringEntity;
}

interface EntityCountsSectionProps<T> {
	entity: T;
	countsConfig: EntityCountConfig<T>[];
	selectedItem: string;
	filterExpression: string;
	closeDrawer: () => void;
	entityType: InfraMonitoringEntity;
	activeTab: string;
}

export function EntityCountsSection<T>({
	entity,
	countsConfig,
	selectedItem,
	filterExpression,
	closeDrawer,
	entityType,
	activeTab,
}: EntityCountsSectionProps<T>): JSX.Element {
	const handleCardNavigate = (cardLabel: string): void => {
		logInfraExplorerNavigatedEvent({
			entityType,
			destination: 'k8s_list',
			source: 'stats_card',
			tab: activeTab,
			sourceKey: cardLabel,
			drawerDurationMsAtNavigation: getDrawerDurationMs(),
		});
		closeDrawer();
	};

	const buildNavigationUrl = (targetCategory: InfraMonitoringEntity): string => {
		const defaultQuery = initialQueriesMap[DataSource.METRICS];

		const compositeQuery = {
			...defaultQuery,
			id: uuid(),
			builder: {
				...defaultQuery.builder,
				queryData: defaultQuery.builder.queryData.map((query) => ({
					...query,
					filter: { expression: filterExpression },
					filters: { items: [], op: 'AND' as const },
				})),
			},
		};

		const urlParams = new URLSearchParams();
		urlParams.set(INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY, targetCategory);
		applySerializedParams(serialize(compositeQuery), urlParams);

		const currentSearchParams = new URLSearchParams(window.location.search);
		const detailRelativeTime = currentSearchParams.get(
			INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_RELATIVE_TIME,
		);
		const detailStartTime = currentSearchParams.get(
			INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_START_TIME,
		);
		const detailEndTime = currentSearchParams.get(
			INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_END_TIME,
		);

		const listRelativeTime = currentSearchParams.get(QueryParams.relativeTime);
		const listStartTime = currentSearchParams.get(QueryParams.startTime);
		const listEndTime = currentSearchParams.get(QueryParams.endTime);

		if (listRelativeTime) {
			urlParams.set(QueryParams.relativeTime, listRelativeTime);
		} else if (listStartTime && listEndTime) {
			urlParams.set(QueryParams.startTime, listStartTime);
			urlParams.set(QueryParams.endTime, listEndTime);
		}

		if (detailRelativeTime) {
			urlParams.set(
				INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_RELATIVE_TIME,
				detailRelativeTime,
			);
		} else if (detailStartTime && detailEndTime) {
			urlParams.set(
				INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_START_TIME,
				detailStartTime,
			);
			urlParams.set(
				INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_END_TIME,
				detailEndTime,
			);
		}

		return `${ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES}?${urlParams.toString()}`;
	};

	return (
		<div className={styles.countsContainer}>
			{countsConfig.map((config) => (
				<div
					key={config.label}
					className={styles.countCard}
					data-testid={`count-card-${config.label.toLowerCase().replace(/\s+/g, '-')}`}
				>
					<Typography.Text
						color="muted"
						size="small"
						weight="medium"
						className={styles.countLabel}
					>
						{config.label}
					</Typography.Text>
					{config.getValue(entity) ? (
						<Typography.Text
							className={styles.countValue}
							size="xl"
							weight="semibold"
						>
							{config.getValue(entity)}
						</Typography.Text>
					) : (
						<TextNoData type="typography" className={styles.countValue} />
					)}
					<Link
						to={buildNavigationUrl(config.targetCategory)}
						onClick={(): void => handleCardNavigate(config.label)}
						data-testid={`navigate-${config.label.toLowerCase().replace(/\s+/g, '-')}`}
					>
						<TooltipSimple
							title={`View ${config.label.toLowerCase()} of '${selectedItem}'`}
							side="top"
							arrow
						>
							<Button
								size="icon"
								variant="ghost"
								color="secondary"
								className={styles.navigateButton}
								prefix={<Compass size={14} />}
							/>
						</TooltipSimple>
					</Link>
				</div>
			))}
		</div>
	);
}
