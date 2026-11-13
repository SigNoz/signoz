import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Table } from 'antd';
import type { TableColumnsType, TableProps } from 'antd';
import {
	useGetMetricReductionRuleStats,
	useListMetricReductionRules,
} from 'api/generated/services/metrics';
import {
	ListMetricReductionRulesParams,
	MetricreductionruletypesGettableReductionRuleDTO,
	MetricreductionruletypesOrderDTO,
	MetricreductionruletypesReductionRuleOrderByDTO,
} from 'api/generated/services/sigNoz.schemas';
import dayjs from 'dayjs';
import { useVolumeControlFeatureGate } from 'hooks/metricsExplorer/useVolumeControlFeatureGate';
import useDebounce from 'hooks/useDebounce';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatCompact } from '../../configUtils';
import { getLabelVerb, getMatchTypeLabel } from '../../ruleUtils';
import VolumeControlBadge from '../VolumeControlBadge';
import VolumeControlChart from '../VolumeControlChart/VolumeControlChart';
import VolumeControlConfigDrawer from '../VolumeControlConfigDrawer/VolumeControlConfigDrawer';
import VolumeControlHeader from './VolumeControlHeader/VolumeControlHeader';
import VolumeControlStats from './VolumeControlStats/VolumeControlStats';
import styles from './VolumeControlTab.module.scss';
import VolumeControlToolbar from './VolumeControlToolbar/VolumeControlToolbar';

const OrderBy = MetricreductionruletypesReductionRuleOrderByDTO;
const SortOrder = MetricreductionruletypesOrderDTO;
const DEFAULT_PAGE_SIZE = 10;

type VolumeControlTableParams = Required<
	Omit<ListMetricReductionRulesParams, 'metricName'>
>;

const DEFAULT_PARAMS: VolumeControlTableParams = {
	orderBy: OrderBy.ingested_volume,
	order: SortOrder.desc,
	search: '',
	offset: 0,
	limit: DEFAULT_PAGE_SIZE,
};

function VolumeControlTab(): JSX.Element {
	const { isVolumeControlEnabled, canManageVolumeControl } =
		useVolumeControlFeatureGate();
	const [selectedRule, setSelectedRule] =
		useState<MetricreductionruletypesGettableReductionRuleDTO | null>(null);
	const [params, setParams] = useState<VolumeControlTableParams>(DEFAULT_PARAMS);

	const [searchInput, setSearchInput] = useState('');
	const debouncedSearch = useDebounce(searchInput, 400);
	useEffect(() => {
		setParams((prev) =>
			prev.search === debouncedSearch
				? prev
				: { ...prev, search: debouncedSearch, offset: 0 },
		);
	}, [debouncedSearch]);

	const {
		data,
		isLoading,
		isError: isListError,
	} = useListMetricReductionRules(params, {
		query: { enabled: isVolumeControlEnabled },
	});

	const {
		data: statsData,
		isLoading: isStatsLoading,
		isFetching: isStatsFetching,
		isError: isStatsError,
	} = useGetMetricReductionRuleStats({
		query: { enabled: isVolumeControlEnabled },
	});
	const stats = statsData?.data;

	const rules = data?.data.rules ?? [];
	const total = data?.data.total ?? 0;

	const sortOrderFor = useCallback(
		(
			key: MetricreductionruletypesReductionRuleOrderByDTO,
		): 'ascend' | 'descend' | undefined => {
			if (params.orderBy !== key) {
				return undefined;
			}
			return params.order === SortOrder.desc ? 'descend' : 'ascend';
		},
		[params],
	);

	const columns: TableColumnsType<MetricreductionruletypesGettableReductionRuleDTO> =
		useMemo(
			() => [
				{
					title: 'METRIC',
					dataIndex: 'metricName',
					key: OrderBy.metric,
					sorter: true,
					sortOrder: sortOrderFor(OrderBy.metric),
					render: (metricName: string): JSX.Element => (
						<Typography
							variant="code"
							size="small"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							{metricName}
						</Typography>
					),
				},
				{
					title: 'STATUS',
					key: 'status',
					width: 130,
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => <VolumeControlBadge rule={rule} />,
				},
				{
					title: 'MODE',
					key: 'mode',
					width: 110,
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => (
						<Typography
							variant="paragraph"
							size="small"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							{getMatchTypeLabel(rule.matchType)}
						</Typography>
					),
				},
				{
					title: 'ATTRIBUTES',
					key: 'attributes',
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => (
						<Typography
							variant="code"
							size="small"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							{getLabelVerb(rule.matchType)} {(rule.labels ?? []).join(', ') || '—'}
						</Typography>
					),
				},
				{
					title: (
						<>
							INGESTED{' '}
							<Typography
								variant="paragraph"
								size="small"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="wrap"
							>
								(1h)
							</Typography>
						</>
					),
					key: OrderBy.ingested_volume,
					width: 130,
					sorter: true,
					sortOrder: sortOrderFor(OrderBy.ingested_volume),
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => (
						<div className={styles.volumeCell}>
							<Typography
								variant="paragraph"
								size="small"
								weight="regular"
								color="inherit"
								as="span"
								textOverflow="wrap"
							>
								{formatCompact(rule.ingestedSeries)}{' '}
								<Typography
									variant="paragraph"
									size="small"
									weight="regular"
									color="secondary"
									as="span"
									textOverflow="wrap"
								>
									series
								</Typography>
							</Typography>
							<Typography
								variant="paragraph"
								size="small"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="wrap"
							>
								{formatCompact(rule.ingestedSamples)} samples
							</Typography>
						</div>
					),
				},
				{
					title: (
						<>
							RETAINED{' '}
							<Typography
								variant="paragraph"
								size="small"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="wrap"
							>
								(1h)
							</Typography>
						</>
					),
					key: OrderBy.reduced_volume,
					width: 130,
					sorter: true,
					sortOrder: sortOrderFor(OrderBy.reduced_volume),
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => (
						<div className={styles.volumeCell}>
							<Typography
								variant="paragraph"
								size="small"
								weight="regular"
								color="inherit"
								as="span"
								textOverflow="wrap"
							>
								{formatCompact(rule.retainedSeries)}{' '}
								<Typography
									variant="paragraph"
									size="small"
									weight="regular"
									color="secondary"
									as="span"
									textOverflow="wrap"
								>
									series
								</Typography>
							</Typography>
							<Typography
								variant="paragraph"
								size="small"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="wrap"
							>
								{formatCompact(rule.retainedSamples)} samples
							</Typography>
						</div>
					),
				},
				{
					title: 'CHANGE',
					width: 140,
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => {
						const seriesReduction =
							rule.ingestedSeries > 0
								? (1 - rule.retainedSeries / rule.ingestedSeries) * 100
								: 0;
						const samplesReduction =
							rule.ingestedSamples > 0
								? (1 - rule.retainedSamples / rule.ingestedSamples) * 100
								: 0;
						if (seriesReduction <= 0 && samplesReduction <= 0) {
							return (
								<Typography
									variant="paragraph"
									size="small"
									weight="regular"
									color="secondary"
									as="span"
									textOverflow="wrap"
								>
									—
								</Typography>
							);
						}
						return (
							<div className={styles.volumeCell}>
								<Typography
									variant="paragraph"
									size="small"
									weight="bold"
									color="success"
									as="span"
									textOverflow="wrap"
								>
									{seriesReduction > 0 ? `−${Math.round(seriesReduction)}%` : '0%'}{' '}
									<Typography
										variant="paragraph"
										size="small"
										weight="regular"
										color="secondary"
										as="span"
										textOverflow="wrap"
									>
										series
									</Typography>
								</Typography>
								<Typography
									variant="paragraph"
									size="small"
									weight="regular"
									color="secondary"
									as="span"
									textOverflow="wrap"
								>
									{samplesReduction > 0 ? `−${Math.round(samplesReduction)}%` : '0%'}{' '}
									samples
								</Typography>
							</div>
						);
					},
				},
				{
					title: 'LAST CONFIGURED',
					key: OrderBy.last_updated,
					width: 240,
					sorter: true,
					sortOrder: sortOrderFor(OrderBy.last_updated),
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => (
						<Typography
							variant="paragraph"
							size="small"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							{dayjs(rule.updatedAt).format('MMM D, YYYY · h:mm A')}
							{rule.updatedBy ? ` · ${rule.updatedBy}` : ''}
						</Typography>
					),
				},
				...(canManageVolumeControl
					? ([
							{
								title: '',
								key: 'action',
								width: 110,
								render: (
									_value: unknown,
									rule: MetricreductionruletypesGettableReductionRuleDTO,
								): JSX.Element => (
									<Button
										size="md"
										variant="ghost"
										color="secondary"
										onClick={(): void => setSelectedRule(rule)}
										testId={`volume-control-manage-${rule.metricName}`}
									>
										Manage
									</Button>
								),
							},
						] as TableColumnsType<MetricreductionruletypesGettableReductionRuleDTO>)
					: []),
			],
			[canManageVolumeControl, sortOrderFor],
		);

	const handleTableChange: TableProps<MetricreductionruletypesGettableReductionRuleDTO>['onChange'] =
		(pagination, _filters, sorter): void => {
			const active = Array.isArray(sorter) ? sorter[0] : sorter;
			const pageSize = pagination.pageSize ?? DEFAULT_PAGE_SIZE;
			const current = pagination.current ?? 1;

			setParams((prev) => ({
				...prev,
				orderBy: active?.order
					? (active.columnKey as MetricreductionruletypesReductionRuleOrderByDTO)
					: DEFAULT_PARAMS.orderBy,
				order: active?.order === 'descend' ? SortOrder.desc : SortOrder.asc,
				limit: pageSize,
				offset: (current - 1) * pageSize,
			}));
		};

	if (!isVolumeControlEnabled) {
		return (
			<div className={styles.unavailable} data-testid="volume-control-unavailable">
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="secondary"
					as="span"
					textOverflow="wrap"
				>
					Volume control is available on enterprise and cloud plans.
				</Typography>
			</div>
		);
	}

	return (
		<div className={styles.tab} data-testid="volume-control-tab">
			<VolumeControlHeader />

			<VolumeControlStats
				activeRules={total}
				ingestedSeries={stats?.ingestedSeries ?? 0}
				retainedSeries={stats?.retainedSeries ?? 0}
				ingestedSamples={stats?.ingestedSamples ?? 0}
				retainedSamples={stats?.retainedSamples ?? 0}
				estimatedMonthlySavingsUsd={stats?.estimatedMonthlySavingsUsd ?? 0}
				isLoading={isStatsLoading || isStatsFetching}
				isError={isStatsError}
			/>

			<VolumeControlChart enabled={isVolumeControlEnabled} />

			<VolumeControlToolbar value={searchInput} onChange={setSearchInput} />

			<Table<MetricreductionruletypesGettableReductionRuleDTO>
				rowKey="metricName"
				loading={isLoading}
				dataSource={rules}
				columns={columns}
				onChange={handleTableChange}
				pagination={{
					current: Math.floor(params.offset / params.limit) + 1,
					pageSize: params.limit,
					total,
					showSizeChanger: false,
				}}
				locale={{
					emptyText: isListError ? (
						<div className={styles.empty} data-testid="volume-control-tab-error">
							<Typography
								variant="paragraph"
								size="base"
								weight="regular"
								color="danger"
								as="span"
								textOverflow="wrap"
							>
								Failed to load volume control rules. Please try again.
							</Typography>
						</div>
					) : (
						<div className={styles.empty} data-testid="volume-control-tab-empty">
							<Typography
								variant="paragraph"
								size="base"
								weight="regular"
								color="secondary"
								as="span"
								textOverflow="wrap"
							>
								No volume control rules yet. Open a metric and set one up to start
								reducing its series volume.
							</Typography>
						</div>
					),
				}}
			/>

			{canManageVolumeControl && selectedRule && (
				<VolumeControlConfigDrawer
					metricName={selectedRule.metricName}
					existingRule={selectedRule}
					open={!!selectedRule}
					onClose={(): void => setSelectedRule(null)}
				/>
			)}
		</div>
	);
}

export default VolumeControlTab;
