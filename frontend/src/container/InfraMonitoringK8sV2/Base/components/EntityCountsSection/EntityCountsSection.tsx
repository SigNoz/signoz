import { Tooltip } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Compass } from '@signozhq/icons';
import { QueryParams } from 'constants/query';
import { initialQueriesMap } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { Link } from 'react-router-dom';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from '../../../constants';
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
}

export function EntityCountsSection<T>({
	entity,
	countsConfig,
	selectedItem,
	filterExpression,
	closeDrawer,
}: EntityCountsSectionProps<T>): JSX.Element {
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
		urlParams.set(
			QueryParams.compositeQuery,
			encodeURIComponent(JSON.stringify(compositeQuery)),
		);

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
					<Typography.Text className={styles.countValue} size="xl" weight="semibold">
						{config.getValue(entity) || '-'}
					</Typography.Text>
					<Link
						to={buildNavigationUrl(config.targetCategory)}
						onClick={closeDrawer}
						data-testid={`navigate-${config.label.toLowerCase().replace(/\s+/g, '-')}`}
					>
						<Tooltip
							title={`View ${config.label.toLowerCase()} of '${selectedItem}'`}
							placement="top"
						>
							<Button
								size="icon"
								variant="ghost"
								color="secondary"
								className={styles.navigateButton}
								prefix={<Compass size={14} />}
							/>
						</Tooltip>
					</Link>
				</div>
			))}
		</div>
	);
}
