import './WidgetFullView.styles.scss';

import { Button, Input } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ResizeTable } from 'components/ResizeTable';
import { useNotifications } from 'hooks/useNotifications';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { memo, useCallback, useEffect, useState } from 'react';

import { getGraphManagerTableColumns } from './TableRender/GraphManagerColumns';
import { ExtendedChartDataset, GraphManagerProps } from './types';
import {
	getDefaultTableDataSet,
	saveLegendEntriesToLocalStorage,
} from './utils';

function GraphManager({
	data,
	name,
	yAxisUnit,
	onToggleModelHandler,
	setGraphsVisibilityStates,
	graphsVisibilityStates = [], // not trimed
	lineChartRef,
	parentChartRef,
	options,
}: GraphManagerProps): JSX.Element {
	const [tableDataSet, setTableDataSet] = useState<ExtendedChartDataset[]>(
		getDefaultTableDataSet(options, data),
	);

	useEffect(() => {
		setTableDataSet(getDefaultTableDataSet(options, data));
	}, [data, options]);

	const { notifications } = useNotifications();
	const { isDashboardLocked } = useDashboard();

	const checkBoxOnChangeHandler = useCallback(
		(e: CheckboxChangeEvent, index: number): void => {
			const newStates = [...graphsVisibilityStates];
			newStates[index] = e.target.checked;
			lineChartRef?.current?.toggleGraph(index, e.target.checked);
			parentChartRef?.current?.toggleGraph(index, e.target.checked);
			setGraphsVisibilityStates([...newStates]);
		},
		[
			graphsVisibilityStates,
			lineChartRef,
			parentChartRef,
			setGraphsVisibilityStates,
		],
	);

	const labelClickedHandler = useCallback(
		(labelIndex: number): void => {
			const newGraphVisibilityStates = Array<boolean>(data.length).fill(false);
			newGraphVisibilityStates[labelIndex] = true;

			newGraphVisibilityStates.forEach((state, index) => {
				lineChartRef?.current?.toggleGraph(index, state);
				parentChartRef?.current?.toggleGraph(index, state);
			});
			setGraphsVisibilityStates(newGraphVisibilityStates);
		},
		[data.length, lineChartRef, parentChartRef, setGraphsVisibilityStates],
	);

	const columns = getGraphManagerTableColumns({
		tableDataSet,
		checkBoxOnChangeHandler,
		graphVisibilityState: graphsVisibilityStates,
		labelClickedHandler,
		yAxisUnit,
		isGraphDisabled: isDashboardLocked,
	});

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

	const saveHandler = useCallback((): void => {
		saveLegendEntriesToLocalStorage({
			options,
			graphVisibilityState: graphsVisibilityStates || [],
			name,
		});
		notifications.success({
			message: 'The updated graphs & legends are saved',
		});
		if (onToggleModelHandler) {
			onToggleModelHandler();
		}
	}, [
		graphsVisibilityStates,
		name,
		notifications,
		onToggleModelHandler,
		options,
	]);

	const dataSource = tableDataSet.filter(
		(item, index) => index !== 0 && item.show,
	);

	return (
		<div className="graph-manager-container">
			<div className="graph-manager-header">
				<Input onChange={filterHandler} placeholder="Filter Series" />
				<div className="save-cancel-container">
					<span className="save-cancel-button">
						<Button type="default" onClick={onToggleModelHandler}>
							Cancel
						</Button>
					</span>
					<span className="save-cancel-button">
						<Button type="primary" onClick={saveHandler}>
							Save
						</Button>
					</span>
				</div>
			</div>

			<div className="legends-list-container">
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

GraphManager.defaultProps = {
	graphVisibilityStateHandler: undefined,
};

export default memo(GraphManager);
