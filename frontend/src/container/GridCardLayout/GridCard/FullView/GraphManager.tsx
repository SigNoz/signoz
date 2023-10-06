import './GraphManager.styles.scss';

import { Button, Input } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ResizeTable } from 'components/ResizeTable';
import { useNotifications } from 'hooks/useNotifications';
import { memo, useCallback, useState } from 'react';

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
	graphsVisibilityStates = [],
	lineChartRef,
	parentChartRef,
}: GraphManagerProps): JSX.Element {
	const [tableDataSet, setTableDataSet] = useState<ExtendedChartDataset[]>(
		getDefaultTableDataSet(data),
	);

	const { notifications } = useNotifications();

	const checkBoxOnChangeHandler = useCallback(
		(e: CheckboxChangeEvent, index: number): void => {
			const newStates = [...graphsVisibilityStates];

			newStates[index] = e.target.checked;

			lineChartRef?.current?.toggleGraph(index, e.target.checked);

			setGraphsVisibilityStates([...newStates]);
		},
		[graphsVisibilityStates, setGraphsVisibilityStates, lineChartRef],
	);

	const labelClickedHandler = useCallback(
		(labelIndex: number): void => {
			const newGraphVisibilityStates = Array<boolean>(data.datasets.length).fill(
				false,
			);
			newGraphVisibilityStates[labelIndex] = true;

			newGraphVisibilityStates.forEach((state, index) => {
				lineChartRef?.current?.toggleGraph(index, state);
				parentChartRef?.current?.toggleGraph(index, state);
			});
			setGraphsVisibilityStates(newGraphVisibilityStates);
		},
		[
			data.datasets.length,
			setGraphsVisibilityStates,
			lineChartRef,
			parentChartRef,
		],
	);

	const columns = getGraphManagerTableColumns({
		data,
		checkBoxOnChangeHandler,
		graphVisibilityState: graphsVisibilityStates || [],
		labelClickedHandler,
		yAxisUnit,
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
			data,
			graphVisibilityState: graphsVisibilityStates || [],
			name,
		});
		notifications.success({
			message: 'The updated graphs & legends are saved',
		});
		if (onToggleModelHandler) {
			onToggleModelHandler();
		}
	}, [data, graphsVisibilityStates, name, notifications, onToggleModelHandler]);

	const dataSource = tableDataSet.filter((item) => item.show);

	return (
		<div className="graph-manager-container">
			<div className="filter-table-container">
				<Input onChange={filterHandler} placeholder="Filter Series" />
				<ResizeTable
					columns={columns}
					dataSource={dataSource}
					rowKey="index"
					pagination={false}
					scroll={{ y: 240 }}
				/>
			</div>
			<div className="save-cancel-container">
				<span className="save-cancel-button">
					<Button type="default" onClick={onToggleModelHandler}>
						Cancel
					</Button>
				</span>
				<span className="save-cancel-button">
					<Button onClick={saveHandler} type="primary">
						Save
					</Button>
				</span>
			</div>
		</div>
	);
}

GraphManager.defaultProps = {
	graphVisibilityStateHandler: undefined,
};

export default memo(GraphManager);
