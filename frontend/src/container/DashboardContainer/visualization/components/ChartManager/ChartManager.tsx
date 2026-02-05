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

interface GraphManagerProps {
	config: UPlotConfigBuilder;
	data: uPlot.AlignedData;
	yAxisUnit?: string;
	onCancel?: () => void;
}

export default function ChartManager({
	config,
	data,
	yAxisUnit,
	onCancel,
}: GraphManagerProps): JSX.Element {
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

	const [tableDataSet, setTableDataSet] = useState<ExtendedChartDataset[]>(
		getDefaultTableDataSet(config.getConfig() as uPlot.Options, data),
	);

	const graphVisibilityState = useMemo(() => {
		const byIndex: boolean[] = [];
		Object.entries(legendItemsMap).forEach(([key, item]) => {
			byIndex[Number(key)] = item.show;
		});
		return byIndex;
	}, [legendItemsMap]);

	useEffect(() => {
		setTableDataSet(
			getDefaultTableDataSet(config.getConfig() as uPlot.Options, data),
		);
	}, [data, config]);

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

	const dataSource = tableDataSet.filter(
		(item, index) => index !== 0 && item.show,
	);

	const columns = getGraphManagerTableColumns({
		tableDataSet,
		checkBoxOnChangeHandler: (_e, index) => {
			onToggleSeriesOnOff(index);
		},
		graphVisibilityState,
		labelClickedHandler: onToggleSeriesVisibility,
		yAxisUnit,
		isGraphDisabled: isDashboardLocked,
	});

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
					rowKey="index"
					pagination={false}
					style={{
						maxHeight: 200,
						overflowX: 'hidden',
						overflowY: 'auto',
					}}
				/>
			</div>
		</div>
	);
}
