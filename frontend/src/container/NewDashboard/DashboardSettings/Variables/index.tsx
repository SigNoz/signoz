/* eslint-disable no-restricted-syntax */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable import/no-extraneous-dependencies */
import { blue, red } from '@ant-design/colors';
import { PlusOutlined } from '@ant-design/icons';
import type { DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import {
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Modal, Row, Space, Table, Tag } from 'antd';
import { RowProps } from 'antd/lib';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
import { PencilIcon, TrashIcon } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';
import { v4 as generateUUID } from 'uuid';

import { TVariableMode } from './types';
import VariableItem from './VariableItem/VariableItem';

function TableRow(props: RowProps): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: props['data-row-key'],
	});

	const style: React.CSSProperties = {
		...props.style,
		transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
		transition,
		cursor: 'move',
		...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
	};

	return (
		<tr
			{...props}
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
		/>
	);
}

function VariablesSetting(): JSX.Element {
	const variableToDelete = useRef<string | null>(null);
	const [deleteVariableModal, setDeleteVariableModal] = useState(false);

	const { t } = useTranslation(['dashboard']);

	const { selectedDashboard, setSelectedDashboard } = useDashboard();

	const { notifications } = useNotifications();

	const { variables = {} } = selectedDashboard?.data || {};

	const [variablesTableData, setVariablesTableData] = useState<any>([]);
	const [variblesOrderArr, setVariablesOrderArr] = useState<number[]>([]);

	const [variableViewMode, setVariableViewMode] = useState<null | TVariableMode>(
		null,
	);

	const [
		variableEditData,
		setVariableEditData,
	] = useState<null | IDashboardVariable>(null);

	const onDoneVariableViewMode = (): void => {
		setVariableViewMode(null);
		setVariableEditData(null);
	};

	const onVariableViewModeEnter = (
		viewType: TVariableMode,
		varData: IDashboardVariable,
	): void => {
		setVariableEditData(varData);
		setVariableViewMode(viewType);
	};

	const updateMutation = useUpdateDashboard();

	useEffect(() => {
		console.log('variables', variables);

		const tableRowData = [];
		const variableOrderArr = [];

		for (const [key, value] of Object.entries(variables)) {
			console.log(`${key}: ${value}`);

			const { order, id } = value;

			tableRowData.push({
				key,
				name: key,
				...variables[key],
				id: id || generateUUID(),
			});

			if (order) {
				variableOrderArr.push(order);
			}
		}

		tableRowData.sort((a, b) => a.order - b.order);
		variableOrderArr.sort((a, b) => a - b);

		console.log('tableRowData', tableRowData);
		console.log('variableOrderArr', variableOrderArr);

		setVariablesTableData(tableRowData);
		setVariablesOrderArr(variableOrderArr);
	}, [variables]);

	const updateVariables = (
		updatedVariablesData: Dashboard['data']['variables'],
	): void => {
		if (!selectedDashboard) {
			return;
		}

		updateMutation.mutateAsync(
			{
				...selectedDashboard,
				data: {
					...selectedDashboard.data,
					variables: updatedVariablesData,
				},
			},
			{
				onSuccess: (updatedDashboard) => {
					if (updatedDashboard.payload) {
						setSelectedDashboard(updatedDashboard.payload);
						notifications.success({
							message: t('variable_updated_successfully'),
						});
					}
				},
				onError: () => {
					notifications.error({
						message: t('error_while_updating_variable'),
					});
				},
			},
		);
	};

	const getVariableOrder = (): number => {
		if (variblesOrderArr && variblesOrderArr.length > 0) {
			return variblesOrderArr[variblesOrderArr.length - 1] + 1;
		}

		return 0;
	};

	const convertVariablesToDbFormat = (
		variblesArr: IDashboardVariable[],
	): Dashboard['data']['variables'] =>
		variblesArr.reduce((result, obj: IDashboardVariable) => {
			const { id } = obj;
			result[id] = obj;
			return result;
		}, {});

	const onVariableSaveHandler = (
		mode: TVariableMode,
		variableData: IDashboardVariable,
	): void => {
		console.log('variable Data', variableData, mode);

		const updatedVariableData = {
			...variableData,
			order:
				variableData.order && variableData.order >= 0
					? variableData.order
					: getVariableOrder(),
		};

		console.log('updatedVariableData', updatedVariableData);

		const newVariablesArr = variablesTableData.map(
			(variable: IDashboardVariable) => {
				if (variable.id === updatedVariableData.id) {
					return updatedVariableData;
				}

				return variable;
			},
		);

		if (mode === 'ADD') {
			newVariablesArr.push(updatedVariableData);
		}

		console.log('newVariablesArr', newVariablesArr);

		const variables = convertVariablesToDbFormat(newVariablesArr);

		// if (newVariables[name]) {
		// 	newVariables[name] = updatedVariableData;
		// }

		// console.log('final update', newVariables);

		console.log('variables', variables);

		updateVariables(variables);
		onDoneVariableViewMode();
	};

	const onVariableDeleteHandler = (variableName: string): void => {
		variableToDelete.current = variableName;
		setDeleteVariableModal(true);
	};

	const handleDeleteConfirm = (): void => {
		const newVariables = { ...variables };
		if (variableToDelete?.current) delete newVariables[variableToDelete?.current];
		updateVariables(newVariables);
		variableToDelete.current = null;
		setDeleteVariableModal(false);
	};
	const handleDeleteCancel = (): void => {
		variableToDelete.current = null;
		setDeleteVariableModal(false);
	};

	const validateVariableName = (name: string): boolean => !variables[name];

	const columns = [
		{
			title: 'Variable',
			dataIndex: 'name',
			width: 100,
			key: 'name',
		},
		{
			title: 'Description',
			dataIndex: 'description',
			width: 100,
			key: 'description',
		},
		{
			title: 'Actions',
			width: 50,
			key: 'action',
			render: (_: IDashboardVariable): JSX.Element => (
				<Space>
					<Button
						type="text"
						style={{ padding: 8, cursor: 'pointer', color: blue[5] }}
						onClick={(): void => onVariableViewModeEnter('EDIT', _)}
					>
						<PencilIcon size={14} />
					</Button>
					<Button
						type="text"
						style={{ padding: 8, color: red[6], cursor: 'pointer' }}
						onClick={(): void => {
							if (_.name) onVariableDeleteHandler(_.name);
						}}
					>
						<TrashIcon size={14} />
					</Button>
				</Space>
			),
		},
	];

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				// https://docs.dndkit.com/api-documentation/sensors/pointer#activation-constraints
				distance: 1,
			},
		}),
	);

	const onDragEnd = ({ active, over }: DragEndEvent): void => {
		if (active.id !== over?.id) {
			const activeIndex = variablesTableData.findIndex(
				(i: { key: UniqueIdentifier }) => i.key === active.id,
			);
			const overIndex = variablesTableData.findIndex(
				(i: { key: UniqueIdentifier | undefined }) => i.key === over?.id,
			);

			const updatedVariables: IDashboardVariable[] = arrayMove(
				variablesTableData,
				activeIndex,
				overIndex,
			);

			const reArrangedVariables = {};

			for (let index = 0; index < updatedVariables.length; index += 1) {
				const variableName = updatedVariables[index].name;

				if (variableName) {
					reArrangedVariables[variableName] = {
						...updatedVariables[index],
						order: index,
					};
				}
			}

			updateVariables(reArrangedVariables);

			setVariablesTableData(updatedVariables);
		}
	};

	console.log('variableViewMode', variableViewMode);

	return (
		<>
			{variableViewMode ? (
				<VariableItem
					variableData={{ ...variableEditData } as IDashboardVariable}
					existingVariables={variables}
					onSave={onVariableSaveHandler}
					onCancel={onDoneVariableViewMode}
					validateName={validateVariableName}
					mode={variableViewMode}
				/>
			) : (
				<>
					<Row
						style={{
							flexDirection: 'row',
							justifyContent: 'flex-end',
							padding: '0.5rem 0',
						}}
					>
						<Button
							data-testid="add-new-variable"
							type="primary"
							onClick={(): void =>
								onVariableViewModeEnter('ADD', {} as IDashboardVariable)
							}
						>
							<PlusOutlined /> Add Variable
						</Button>
					</Row>

					<DndContext
						sensors={sensors}
						modifiers={[restrictToVerticalAxis]}
						onDragEnd={onDragEnd}
					>
						<SortableContext
							// rowKey array
							items={variablesTableData.map((variable) => variable.key)}
						>
							<Table
								components={{
									body: {
										row: TableRow,
									},
								}}
								rowKey="key"
								// size={100}
								columns={columns}
								pagination={false}
								dataSource={variablesTableData}
							/>
						</SortableContext>
					</DndContext>
				</>
			)}
			<Modal
				title="Delete variable"
				centered
				open={deleteVariableModal}
				onOk={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			>
				Are you sure you want to delete variable{' '}
				<Tag>{variableToDelete.current}</Tag>?
			</Modal>
		</>
	);
}

export default VariablesSetting;
