import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input } from 'antd';
import { ResizeTable } from 'components/ResizeTable';
import { getGraphManagerTableColumns } from 'container/GridCardLayout/GridCard/FullView/TableRender/GraphManagerColumns';
import { ExtendedChartDataset } from 'container/GridCardLayout/GridCard/FullView/types';
import { getDefaultTableDataSet } from 'container/GridCardLayout/GridCard/FullView/utils';
import { useNotifications } from 'hooks/useNotifications';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { usePlotContext } from 'lib/uPlotV2/context/PlotContext';
import useLegendsSync from 'lib/uPlotV2/hooks/useLegendsSync';
import { useDashboard } from 'providers/Dashboard/Dashboard';

import './ChartManager.styles.scss';

interface ChartManagerProps {
	config: UPlotConfigBuilder;
	alignedData: uPlot.AlignedData;
	yAxisUnit?: string;
	onCancel?: () => void;
}

/**
 * ChartManager provides a tabular view to manage the visibility of
 * individual series on a uPlot chart.
 *
 * It syncs with the legend state coming from the plot context and
 * allows users to:
 * - filter series by label
 * - toggle individual series on/off
 * - persist the visibility configuration to local storage.
 *
 * @param config - `UPlotConfigBuilder` instance used to derive chart options.
 * @param alignedData - uPlot aligned data used to build the initial table dataset.
 * @param yAxisUnit - Optional unit label for Y-axis values shown in the table.
 * @param onCancel - Optional callback invoked when the user cancels the dialog.
 */
export default function ChartManager({
	config,
	alignedData,
	yAxisUnit,
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
		getDefaultTableDataSet(config.getConfig() as uPlot.Options, alignedData),
	);

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
			getDefaultTableDataSet(config.getConfig() as uPlot.Options, alignedData),
		);
	}, [alignedData, config]);

	const filterHandler = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>): void => {
			const value = event.target.value.toString().toLowerCase();
			const updatedDataSet = tableDataSet.map((item) => {
				if (item.label?.toLocaleLowerCase().includes(value)) {
					return { ...item, show: true };
				}
				return { ...item, show: false };
			});
			setTableDataSet(updatedDataSet);
		},
		[tableDataSet],
	);

	const dataSource = useMemo(
		() =>
			tableDataSet.filter(
				(item, index) => index !== 0 && item.show, // skipping the first item as it is the x-axis
			),
		[tableDataSet],
	);

	const columns = useMemo(
		() =>
			getGraphManagerTableColumns({
				tableDataSet,
				checkBoxOnChangeHandler: (_e, index) => {
					onToggleSeriesOnOff(index);
				},
				graphVisibilityState,
				labelClickedHandler: onToggleSeriesVisibility,
				yAxisUnit,
				isGraphDisabled: isDashboardLocked,
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[tableDataSet, graphVisibilityState, yAxisUnit, isDashboardLocked],
	);

	const handleSave = useCallback((): void => {
		syncSeriesVisibilityToLocalStorage();
		notifications.success({
			message: 'The updated graphs & legends are saved',
		});
		if (onCancel) {
			onCancel();
		}
	}, [syncSeriesVisibilityToLocalStorage, notifications, onCancel]);

	return (
		<div className="chart-manager-container">
			<div className="chart-manager-header">
				<Input onChange={filterHandler} placeholder="Filter Series" />
				<div className="chart-manager-actions-container">
					<Button type="default" onClick={onCancel}>
						Cancel
					</Button>
					<Button type="primary" onClick={handleSave}>
						Save
					</Button>
				</div>
			</div>
			<div className="chart-manager-table-container">
				<ResizeTable
					columns={columns}
					dataSource={dataSource}
					virtual
					rowKey="index"
					scroll={{ y: 200 }}
					pagination={false}
				/>
			</div>
		</div>
	);
}
