import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input } from 'antd';
import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import { ResizeTable } from 'components/ResizeTable';
import { useNotifications } from 'hooks/useNotifications';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { usePlotContext } from 'lib/uPlotV2/context/PlotContext';
import useLegendsSync from 'lib/uPlotV2/hooks/useLegendsSync';
import { useDashboard } from 'providers/Dashboard/Dashboard';

import { getChartManagerColumns } from './columns';
import { ExtendedChartDataset, getDefaultTableDataSet } from './utils';

import './ChartManager.styles.scss';

interface ChartManagerProps {
	config: UPlotConfigBuilder;
	alignedData: uPlot.AlignedData;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	onCancel?: () => void;
}

const X_AXIS_INDEX = 0;

/**
 * ChartManager provides a tabular view to manage the visibility of
 * individual series on a uPlot chart.
 *
 * It syncs with the legend state coming from the plot context and
 * allows users to:
 * - filter series by label
 * - toggle individual series on/off
 * - persist the visibility configuration to local storage.
 */
export default function ChartManager({
	config,
	alignedData,
	yAxisUnit,
	decimalPrecision = PrecisionOptionsEnum.TWO,
	onCancel,
}: ChartManagerProps): JSX.Element {
	const { notifications } = useNotifications();
	const { legendItemsMap } = useLegendsSync({
		config,
		subscribeToFocusChange: false,
	});
	const {
		onToggleSeriesOnOff,
		onToggleSeriesVisibility,
		syncSeriesVisibilityToLocalStorage,
	} = usePlotContext();
	const { isDashboardLocked } = useDashboard();

	const [tableDataSet, setTableDataSet] = useState<ExtendedChartDataset[]>(() =>
		getDefaultTableDataSet(
			config.getConfig() as uPlot.Options,
			alignedData,
			decimalPrecision,
		),
	);
	const [filterValue, setFilterValue] = useState('');

	const graphVisibilityState = useMemo(
		() =>
			Object.entries(legendItemsMap).reduce<boolean[]>((acc, [key, item]) => {
				acc[Number(key)] = item.show;
				return acc;
			}, []),
		[legendItemsMap],
	);

	useEffect(() => {
		setTableDataSet(
			getDefaultTableDataSet(
				config.getConfig() as uPlot.Options,
				alignedData,
				decimalPrecision,
			),
		);
		setFilterValue('');
	}, [alignedData, config, decimalPrecision]);

	const handleFilterChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			setFilterValue(e.target.value.toLowerCase());
		},
		[],
	);

	const handleToggleSeriesOnOff = useCallback(
		(index: number): void => {
			onToggleSeriesOnOff(index);
		},
		[onToggleSeriesOnOff],
	);

	const dataSource = useMemo(() => {
		const filter = filterValue.trim();
		return tableDataSet.filter((item, index) => {
			if (index === X_AXIS_INDEX) {
				return false;
			}
			if (!filter) {
				return true;
			}
			return item.label?.toLowerCase().includes(filter) ?? false;
		});
	}, [tableDataSet, filterValue]);

	const columns = useMemo(
		() =>
			getChartManagerColumns({
				tableDataSet,
				graphVisibilityState,
				onToggleSeriesOnOff: handleToggleSeriesOnOff,
				onToggleSeriesVisibility,
				yAxisUnit,
				isGraphDisabled: isDashboardLocked,
				decimalPrecision,
			}),
		[
			tableDataSet,
			graphVisibilityState,
			handleToggleSeriesOnOff,
			onToggleSeriesVisibility,
			yAxisUnit,
			isDashboardLocked,
			decimalPrecision,
		],
	);

	const handleSave = useCallback((): void => {
		syncSeriesVisibilityToLocalStorage();
		notifications.success({
			message: 'The updated graphs & legends are saved',
		});
		onCancel?.();
	}, [syncSeriesVisibilityToLocalStorage, notifications, onCancel]);

	return (
		<div className="chart-manager-container">
			<div className="chart-manager-header">
				<Input
					placeholder="Filter Series"
					value={filterValue}
					onChange={handleFilterChange}
					data-testid="filter-input"
				/>
				<div className="chart-manager-actions-container">
					<Button type="default" onClick={onCancel} data-testid="cancel-button">
						Cancel
					</Button>
					<Button type="primary" onClick={handleSave} data-testid="save-button">
						Save
					</Button>
				</div>
			</div>
			<div className="chart-manager-table-container">
				<ResizeTable
					columns={columns}
					dataSource={dataSource}
					rowKey="index"
					scroll={{ y: 200 }}
					pagination={false}
					virtual
				/>
			</div>
		</div>
	);
}
