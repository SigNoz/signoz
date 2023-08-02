import { Button, Input } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ResizeTable } from 'components/ResizeTable';
import { Events } from 'constants/events';
import { useNotifications } from 'hooks/useNotifications';
import isEqual from 'lodash-es/isEqual';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { eventEmitter } from 'utils/getEventEmitter';

import { getGraphVisibilityStateOnDataChange } from '../utils';
import {
	FilterTableAndSaveContainer,
	FilterTableContainer,
	SaveCancelButtonContainer,
	SaveContainer,
} from './styles';
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
}: GraphManagerProps): JSX.Element {
	const {
		graphVisibilityStates: localstoredVisibilityStates,
		legendEntry,
	} = useMemo(
		() =>
			getGraphVisibilityStateOnDataChange({
				data,
				isExpandedName: false,
				name,
			}),
		[data, name],
	);

	const [graphVisibilityState, setGraphVisibilityState] = useState<boolean[]>(
		localstoredVisibilityStates,
	);

	const [tableDataSet, setTableDataSet] = useState<ExtendedChartDataset[]>(
		getDefaultTableDataSet(data),
	);

	const { notifications } = useNotifications();

	// useEffect for updating graph visibility state on data change
	useEffect(() => {
		const newGraphVisibilityStates = Array<boolean>(data.datasets.length).fill(
			true,
		);
		data.datasets.forEach((dataset, i) => {
			const index = legendEntry.findIndex(
				(entry) => entry.label === dataset.label,
			);
			if (index !== -1) {
				newGraphVisibilityStates[i] = legendEntry[index].show;
			}
		});
		eventEmitter.emit(Events.UPDATE_GRAPH_VISIBILITY_STATE, {
			name,
			graphVisibilityStates: newGraphVisibilityStates,
		});
		setGraphVisibilityState(newGraphVisibilityStates);
	}, [data, name, legendEntry]);

	// useEffect for listening to events event graph legend is clicked
	useEffect(() => {
		const eventListener = eventEmitter.on(
			Events.UPDATE_GRAPH_MANAGER_TABLE,
			(data) => {
				if (data.name === name) {
					const newGraphVisibilityStates = graphVisibilityState;
					newGraphVisibilityStates[data.index] = !newGraphVisibilityStates[
						data.index
					];
					eventEmitter.emit(Events.UPDATE_GRAPH_VISIBILITY_STATE, {
						name,
						graphVisibilityStates: newGraphVisibilityStates,
					});
					setGraphVisibilityState([...newGraphVisibilityStates]);
				}
			},
		);
		return (): void => {
			eventListener.off(Events.UPDATE_GRAPH_MANAGER_TABLE);
		};
	}, [graphVisibilityState, name]);

	const checkBoxOnChangeHandler = useCallback(
		(e: CheckboxChangeEvent, index: number): void => {
			graphVisibilityState[index] = e.target.checked;
			setGraphVisibilityState([...graphVisibilityState]);
			eventEmitter.emit(Events.UPDATE_GRAPH_VISIBILITY_STATE, {
				name,
				graphVisibilityStates: [...graphVisibilityState],
			});
		},
		[graphVisibilityState, name],
	);

	const labelClickedHandler = useCallback(
		(labelIndex: number): void => {
			const newGraphVisibilityStates = Array<boolean>(data.datasets.length).fill(
				false,
			);
			newGraphVisibilityStates[labelIndex] = true;
			setGraphVisibilityState([...newGraphVisibilityStates]);
			eventEmitter.emit(Events.UPDATE_GRAPH_VISIBILITY_STATE, {
				name,
				graphVisibilityStates: newGraphVisibilityStates,
			});
		},
		[data.datasets.length, name],
	);

	const columns = useMemo(
		() =>
			getGraphManagerTableColumns({
				data,
				checkBoxOnChangeHandler,
				graphVisibilityState,
				labelClickedHandler,
				yAxisUnit,
			}),
		[
			checkBoxOnChangeHandler,
			data,
			graphVisibilityState,
			labelClickedHandler,
			yAxisUnit,
		],
	);

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
			graphVisibilityState,
			name,
		});
		notifications.success({
			message: 'The updated graphs & legends are saved',
		});
		if (onToggleModelHandler) {
			onToggleModelHandler();
		}
	}, [data, graphVisibilityState, name, notifications, onToggleModelHandler]);

	const dataSource = tableDataSet.filter((item) => item.show);

	return (
		<FilterTableAndSaveContainer>
			<FilterTableContainer>
				<Input onChange={filterHandler} placeholder="Filter Series" />
				<ResizeTable
					columns={columns}
					dataSource={dataSource}
					rowKey="index"
					pagination={false}
					scroll={{ y: 240 }}
				/>
			</FilterTableContainer>
			<SaveContainer>
				<SaveCancelButtonContainer>
					<Button type="default" onClick={onToggleModelHandler}>
						Cancel
					</Button>
				</SaveCancelButtonContainer>
				<SaveCancelButtonContainer>
					<Button onClick={saveHandler} type="primary">
						Save
					</Button>
				</SaveCancelButtonContainer>
			</SaveContainer>
		</FilterTableAndSaveContainer>
	);
}

GraphManager.defaultProps = {
	graphVisibilityStateHandler: undefined,
};

export default memo(
	GraphManager,
	(prevProps, nextProps) =>
		isEqual(prevProps.data, nextProps.data) && prevProps.name === nextProps.name,
);
