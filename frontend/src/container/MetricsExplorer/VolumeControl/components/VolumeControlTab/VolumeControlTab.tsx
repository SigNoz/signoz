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
						<Typography.Text size="small" className={styles.metricNameCell}>
							{metricName}
						</Typography.Text>
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
					): JSX.Element => (
						<Typography.Text size="small">
							{getMatchTypeLabel(rule.matchType)}
						</Typography.Text>
					),
				},
				{
					title: 'ATTRIBUTES',
					key: 'attributes',
					render: (
						_value: unknown,
						rule: MetricreductionruletypesGettableReductionRuleDTO,
					): JSX.Element => (
						<Typography.Text
							size="small"
							color="muted"
							className={styles.attributesCell}
						>
							{getLabelVerb(rule.matchType)} {(rule.labels ?? []).join(', ') || '—'}
						</Typography.Text>
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
						<Typography.Text size="small" color="muted">
							{formatCompact(rule.ingestedSeries)}
						</Typography.Text>
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
					): JSX.Element => (
						<Typography.Text size="small">
							{formatCompact(rule.retainedSeries)}
						</Typography.Text>
					),
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
							return (
								<Typography.Text size="small" color="muted">
									—
								</Typography.Text>
							);
						}
						return (
							<Typography.Text
								size="small"
								weight="semibold"
								color="success"
								className={styles.reductionCell}
							>
								−{Math.round(rule.reductionPercent)}%
							</Typography.Text>
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
						<Typography.Text size="small" color="muted">
							{dayjs(rule.updatedAt).format('MMM D, YYYY · h:mm A')}
							{rule.updatedBy ? ` · ${rule.updatedBy}` : ''}
						</Typography.Text>
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
										data-testid={`volume-control-manage-${rule.metricName}`}
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
				<Typography.Text color="muted">
					Volume control is available on enterprise and cloud plans.
				</Typography.Text>
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
				estimatedMonthlySavingsUsd={stats?.estimatedMonthlySavingsUsd ?? 0}
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
					emptyText: (
						<div className={styles.empty} data-testid="volume-control-tab-empty">
							<Typography.Text color="muted">
								No volume control rules yet. Open a metric and set one up to start
								reducing its series volume.
							</Typography.Text>
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
