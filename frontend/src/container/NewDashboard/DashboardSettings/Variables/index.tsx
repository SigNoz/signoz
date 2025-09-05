import '../DashboardSettings.styles.scss';

import { HolderOutlined, PlusOutlined } from '@ant-design/icons';
import type { DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import {
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable } from '@dnd-kit/sortable';
// eslint-disable-next-line import/no-extraneous-dependencies
import { CSS } from '@dnd-kit/utilities';
import { Button, Modal, Row, Space, Table, Typography } from 'antd';
import { RowProps } from 'antd/lib';
import { convertVariablesToDbFormat } from 'container/NewDashboard/DashboardVariablesSelection/util';
import { useAddDynamicVariableToPanels } from 'hooks/dashboard/useAddDynamicVariableToPanels';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
import { PenLine, Trash2 } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dashboard, IDashboardVariable } from 'types/api/dashboard/getAll';

import { TVariableMode } from './types';
import VariableItem from './VariableItem/VariableItem';

function TableRow({ children, ...props }: RowProps): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		id: props['data-row-key'],
	});

	const style: React.CSSProperties = {
		...props.style,
		transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
		transition,
		...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
	};

	return (
		// eslint-disable-next-line react/jsx-props-no-spreading
		<tr {...props} ref={setNodeRef} style={style} {...attributes}>
			{React.Children.map(children, (child) => {
				const childElement = child as React.ReactElement;
				if (childElement.key === 'name') {
					return React.cloneElement(childElement, {
						key: 'name-with-drag',
						children: (
							<div className="variable-name-drag">
								<HolderOutlined
									ref={setActivatorNodeRef}
									style={{ touchAction: 'none', cursor: 'move' }}
									// eslint-disable-next-line react/jsx-props-no-spreading
									{...listeners}
								/>
								{child}
							</div>
						),
					});
				}

				return childElement;
			})}
		</tr>
	);
}

function VariablesSetting({
	variableViewModeRef,
}: {
	variableViewModeRef: React.MutableRefObject<(() => void) | undefined>;
}): JSX.Element {
	const variableToDelete = useRef<IDashboardVariable | null>(null);
	const [deleteVariableModal, setDeleteVariableModal] = useState(false);
	const variableToApplyToAll = useRef<IDashboardVariable | null>(null);
	const [applyToAllModal, setApplyToAllModal] = useState(false);

	const { t } = useTranslation(['dashboard']);

	const { selectedDashboard, setSelectedDashboard } = useDashboard();

	const { notifications } = useNotifications();

	const variables = useMemo(() => selectedDashboard?.data?.variables || {}, [
		selectedDashboard?.data?.variables,
	]);

	const [variablesTableData, setVariablesTableData] = useState<any>([]);
	const [variblesOrderArr, setVariablesOrderArr] = useState<number[]>([]);
	const [existingVariableNamesMap, setExistingVariableNamesMap] = useState<
		Record<string, string>
	>({});

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

	useEffect(() => {
		if (variableViewModeRef) {
			// eslint-disable-next-line no-param-reassign
			variableViewModeRef.current = onDoneVariableViewMode;
		}
	}, [variableViewModeRef]);

	const updateMutation = useUpdateDashboard();

	const addDynamicVariableToPanels = useAddDynamicVariableToPanels();

	useEffect(() => {
		const tableRowData = [];
		const variableOrderArr = [];
		const variableNamesMap = {};

		// eslint-disable-next-line no-restricted-syntax
		for (const [key, value] of Object.entries(variables)) {
			const { order, id, name } = value;

			tableRowData.push({
				key,
				name: key,
				...variables[key],
				id,
			});

			if (name) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				variableNamesMap[name] = name;
			}

			if (order) {
				variableOrderArr.push(order);
			}
		}

		tableRowData.sort((a, b) => a.order - b.order);
		variableOrderArr.sort((a, b) => a - b);

		setVariablesTableData(tableRowData);
		setVariablesOrderArr(variableOrderArr);
		setExistingVariableNamesMap(variableNamesMap);
	}, [variables]);

	const updateVariables = (
		updatedVariablesData: Dashboard['data']['variables'],
		currentRequestedId?: string,
		widgetIds?: string[],
		applyToAll?: boolean,
	): void => {
		if (!selectedDashboard) {
			return;
		}

		const newDashboard =
			(currentRequestedId &&
				updatedVariablesData[currentRequestedId || '']?.type === 'DYNAMIC' &&
				addDynamicVariableToPanels(
					selectedDashboard,
					updatedVariablesData[currentRequestedId || ''],
					widgetIds,
					applyToAll,
				)) ||
			selectedDashboard;

		updateMutation.mutateAsync(
			{
				id: selectedDashboard.id,

				data: {
					...newDashboard.data,
					variables: updatedVariablesData,
				},
			},
			{
				onSuccess: (updatedDashboard) => {
					if (updatedDashboard.data) {
						setSelectedDashboard(updatedDashboard.data);
						notifications.success({
							message: t('variable_updated_successfully'),
						});
					}
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

	const onVariableSaveHandler = (
		mode: TVariableMode,
		variableData: IDashboardVariable,
		widgetIds?: string[],
		applyToAll?: boolean,
	): void => {
		const updatedVariableData = {
			...variableData,
			order: variableData?.order >= 0 ? variableData.order : getVariableOrder(),
		};

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

		const variables = convertVariablesToDbFormat(newVariablesArr);

		setVariablesTableData(newVariablesArr);
		updateVariables(variables, variableData?.id, widgetIds, applyToAll);
		onDoneVariableViewMode();
	};

	const onVariableDeleteHandler = (variable: IDashboardVariable): void => {
		variableToDelete.current = variable;
		setDeleteVariableModal(true);
	};

	const handleDeleteConfirm = (): void => {
		const newVariablesArr = variablesTableData.filter(
			(variable: IDashboardVariable) =>
				variable.id !== variableToDelete?.current?.id,
		);

		const updatedVariables = convertVariablesToDbFormat(newVariablesArr);

		updateVariables(updatedVariables);
		variableToDelete.current = null;
		setDeleteVariableModal(false);
	};
	const handleDeleteCancel = (): void => {
		variableToDelete.current = null;
		setDeleteVariableModal(false);
	};

	const onApplyToAllHandler = (variable: IDashboardVariable): void => {
		variableToApplyToAll.current = variable;
		setApplyToAllModal(true);
	};

	const handleApplyToAllConfirm = (): void => {
		if (variableToApplyToAll.current) {
			onVariableSaveHandler(
				variableViewMode || 'EDIT',
				variableToApplyToAll.current,
				[],
				true,
			);
		}
		variableToApplyToAll.current = null;
		setApplyToAllModal(false);
	};

	const handleApplyToAllCancel = (): void => {
		variableToApplyToAll.current = null;
		setApplyToAllModal(false);
	};

	const validateVariableName = (name: string): boolean =>
		!existingVariableNamesMap[name];

	const validateAttributeKey = (
		attributeKey: string,
		currentVariableId?: string,
	): boolean => {
		// Check if any other dynamic variable already uses this attribute key
		const isDuplicateAttributeKey = Object.values(variables).some(
			(variable: IDashboardVariable) =>
				variable.type === 'DYNAMIC' &&
				variable.dynamicVariablesAttribute === attributeKey &&
				variable.id !== currentVariableId, // Exclude current variable being edited
		);
		return !isDuplicateAttributeKey;
	};

	const columns = [
		{
			title: 'Variable',
			dataIndex: 'name',
			width: '50%',
			key: 'name',
		},
		{
			title: 'Description',
			width: '50%',
			key: 'description',
			render: (variable: IDashboardVariable): JSX.Element => (
				<div className="variable-description-actions">
					<Typography.Text className="variable-description">
						{variable.description}
					</Typography.Text>
					<Space className="actions-btns">
						{variable.type === 'DYNAMIC' && (
							<Button
								type="text"
								onClick={(): void => onApplyToAllHandler(variable)}
								className="apply-to-all-button"
								loading={updateMutation.isLoading}
							>
								<Typography.Text>Apply to all</Typography.Text>
							</Button>
						)}
						<Button
							type="text"
							onClick={(): void => onVariableViewModeEnter('EDIT', variable)}
							className="edit-variable-button"
						>
							<PenLine size={14} />
						</Button>
						<Button
							type="text"
							onClick={(): void => {
								if (variable) {
									onVariableDeleteHandler(variable);
								}
							}}
							className="delete-variable-button"
						>
							<Trash2 size={14} />
						</Button>
					</Space>
				</div>
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
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
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

	return (
		<>
			{variableViewMode ? (
				<VariableItem
					variableData={{ ...variableEditData } as IDashboardVariable}
					existingVariables={variables}
					onSave={onVariableSaveHandler}
					onCancel={onDoneVariableViewMode}
					validateName={validateVariableName}
					validateAttributeKey={validateAttributeKey}
					mode={variableViewMode}
				/>
			) : (
				<>
					<Row
						style={{
							flexDirection: 'row',
							justifyContent: 'flex-end',
							padding: '0.5rem 0',
							position: 'absolute',
							top: '-56px',
							right: '0px',
							zIndex: '1',
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
							items={variablesTableData.map((variable: { key: any }) => variable.key)}
						>
							<Table
								components={{
									body: {
										row: TableRow,
									},
								}}
								rowKey="key"
								columns={columns}
								pagination={false}
								dataSource={variablesTableData}
								className="dashboard-variable-settings-table"
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
				<Typography.Text>
					Are you sure you want to delete variable{' '}
					<span className="delete-variable-name">
						{variableToDelete?.current?.name}
					</span>
					?
				</Typography.Text>
			</Modal>
			<Modal
				title="Apply variable to all panels"
				centered
				open={applyToAllModal}
				onOk={handleApplyToAllConfirm}
				onCancel={handleApplyToAllCancel}
				okText="Apply to all"
				cancelText="Cancel"
			>
				<Typography.Text>
					Are you sure you want to apply variable{' '}
					<span className="apply-to-all-variable-name">
						{variableToApplyToAll?.current?.name}
					</span>{' '}
					to all panels? This action may affect panels where this variable is not
					applicable.
				</Typography.Text>
			</Modal>
		</>
	);
}

export default VariablesSetting;
