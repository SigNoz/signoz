import { Gauge } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Input, Table } from 'antd';
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

import {
	formatCompact,
	formatUsd,
} from '../MetricDetails/VolumeControl/configUtils';
import {
	getLabelVerb,
	getMatchTypeLabel,
} from '../MetricDetails/VolumeControl/utils';
import VolumeControlConfigDrawer from '../MetricDetails/VolumeControl/VolumeControlConfigDrawer';
import VolumeControlBadge from './VolumeControlBadge';
import VolumeControlChart from './VolumeControlChart';
import styles from './VolumeControlTab.module.scss';

const OrderBy = MetricreductionruletypesReductionRuleOrderByDTO;
const SortOrder = MetricreductionruletypesOrderDTO;
const DEFAULT_PAGE_SIZE = 10;

type VolumeControlTableParams = Required<
	Omit<ListMetricReductionRulesParams, 'metricName'>
>;

const DEFAULT_PARAMS: VolumeControlTableParams = {
	orderBy: OrderBy.reduction,
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

	const { data, isLoading } = useListMetricReductionRules(params, {
		query: { enabled: isVolumeControlEnabled },
	});

	const { data: statsData } = useGetMetricReductionRuleStats({
		query: { enabled: isVolumeControlEnabled },
	});
	const stats = statsData?.data;
	const overallReduction =
		stats && stats.ingestedSeries > 0
			? Math.round((1 - stats.retainedSeries / stats.ingestedSeries) * 100)
			: 0;

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
						<span className={styles.metricName}>{metricName}</span>
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
					width: 160,
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => <span>{getMatchTypeLabel(rule.matchType)}</span>,
				},
				{
					title: 'ATTRIBUTES',
					key: 'attributes',
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => (
						<span className={styles.attributes}>
							{getLabelVerb(rule.matchType)} {(rule.labels ?? []).join(', ') || '—'}
						</span>
					),
				},
				{
					title: 'INGESTED',
					key: OrderBy.ingested_volume,
					width: 130,
					sorter: true,
					sortOrder: sortOrderFor(OrderBy.ingested_volume),
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => (
						<span className={styles.muted}>{formatCompact(rule.ingestedSeries)}</span>
					),
				},
				{
					title: 'RETAINED',
					key: OrderBy.reduced_volume,
					width: 130,
					sorter: true,
					sortOrder: sortOrderFor(OrderBy.reduced_volume),
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => <span>{formatCompact(rule.retainedSeries)}</span>,
				},
				{
					title: 'CHANGE',
					key: OrderBy.reduction,
					width: 110,
					sorter: true,
					sortOrder: sortOrderFor(OrderBy.reduction),
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => {
						if (rule.reductionPercent <= 0) {
							return <span className={styles.muted}>—</span>;
						}
						return (
							<span className={styles.reduction}>
								−{Math.round(rule.reductionPercent)}%
							</span>
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
						<span className={styles.muted}>
							{dayjs(rule.updatedAt).format('MMM D, YYYY · h:mm A')}
							{rule.updatedBy ? ` · ${rule.updatedBy}` : ''}
						</span>
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
										variant="ghost"
										color="secondary"
										onClick={(): void => setSelectedRule(rule)}
										data-testid={`vc-manage-${rule.metricName}`}
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
				<Typography.Text>
					Volume control is available on enterprise and cloud plans.
				</Typography.Text>
			</div>
		);
	}

	return (
		<div className={styles.tab} data-testid="volume-control-tab">
			<div className={styles.header}>
				<div className={styles.titleRow}>
					<Gauge size={18} />
					<Typography.Title level={4} className={styles.title}>
						Volume Control
					</Typography.Title>
				</div>
				<Typography.Text className={styles.subtitle}>
					Aggregate away high-cardinality attributes to reduce stored metric volume
					and cost.
				</Typography.Text>
			</div>

			<div className={styles.stats}>
				<div className={styles.stat}>
					<span className={styles.statLabel}>Active rules</span>
					<span className={styles.statValue}>{total}</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statLabel}>Ingested series</span>
					<span className={styles.statValue}>
						{formatCompact(stats?.ingestedSeries ?? 0)}
					</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.statLabel}>Retained series</span>
					<span className={styles.statValue}>
						{formatCompact(stats?.retainedSeries ?? 0)}
						{overallReduction > 0 && (
							<span className={styles.statDelta}>−{overallReduction}%</span>
						)}
					</span>
				</div>
				<div className={`${styles.stat} ${styles.statHero}`}>
					<span className={styles.statLabel}>Est. monthly savings</span>
					<span className={`${styles.statValue} ${styles.statValueGood}`}>
						{formatUsd(stats?.estimatedMonthlySavingsUsd ?? 0)}
						<span className={styles.statUnit}>/mo</span>
					</span>
				</div>
			</div>

			<VolumeControlChart enabled={isVolumeControlEnabled} />

			<div className={styles.toolbar}>
				<Input
					className={styles.search}
					placeholder="Search metrics"
					allowClear
					value={searchInput}
					onChange={(e): void => setSearchInput(e.target.value)}
					data-testid="volume-control-search"
				/>
			</div>

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
					emptyText: (
						<div className={styles.empty} data-testid="volume-control-tab-empty">
							No volume control rules yet. Open a metric and set one up to start
							reducing its series volume.
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
