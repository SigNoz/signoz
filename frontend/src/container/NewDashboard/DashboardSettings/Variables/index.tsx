import { blue, red } from '@ant-design/colors';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Modal, Row, Space, Table, Tag } from 'antd';
import React, { Dispatch, useRef, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ToggleEditMode } from 'store/actions';
import { UpdateDashboardVariables } from 'store/actions/dashboard/updatedDashboardVariables';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import DashboardReducer from 'types/reducer/dashboards';

import { TVariableViewMode } from './types';
import VariableItem from './VariableItem/VariableItem';

function VariablesSetting({
	updateDashboardVariables,
}: DispatchProps): JSX.Element {
	const variableToDelete = useRef<string | null>(null);
	const [deleteVariableModal, setDeleteVariableModal] = useState(false);

	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [selectedDashboard] = dashboards;

	const {
		data: { variables = {} },
	} = selectedDashboard;

	const variablesTableData = Object.keys(variables).map((variableName) => ({
		key: variableName,
		name: variableName,
		...variables[variableName],
	}));

	const [
		variableViewMode,
		setVariableViewMode,
	] = useState<null | TVariableViewMode>(null);

	const [variableEditData, setVariableEditData] = useState<null | number>(null);

	const onDoneVariableViewMode = (): void => {
		setVariableViewMode(null);
		setVariableEditData(null);
	};

	const onVariableViewModeEnter = (
		viewType: TVariableViewMode,
		varData: number,
	): void => {
		setVariableEditData(varData);
		setVariableViewMode(viewType);
	};

	const onVariableSaveHandler = (variableData: IDashboardVariable): void => {
		if (!variableData.name) {
			return;
		}
		const newVariables = { ...variables };
		newVariables[variableData.name] = variableData;
		if (newVariables[variableData.name]?.name)
			delete newVariables[variableData.name].name;
		updateDashboardVariables(newVariables);
		onDoneVariableViewMode();
	};

	const onVariableDeleteHandler = (variableName: string): void => {
		variableToDelete.current = variableName;
		setDeleteVariableModal(true);
	};

	const handleDeleteConfirm = (): void => {
		const newVariables = { ...variables };
		if (variableToDelete?.current) delete newVariables[variableToDelete?.current];
		updateDashboardVariables(newVariables);
		variableToDelete.current = null;
		setDeleteVariableModal(false);
	};
	const handleDeleteCancel = (): void => {
		variableToDelete.current = null;
		setDeleteVariableModal(false);
	};

	const validateVariableName = (name: string): boolean => {
		return !variables[name];
	};

	const columns = [
		{
			title: 'Variable',
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: 'Definition',
			dataIndex: 'description',
			key: 'description',
		},
		{
			title: 'Actions',
			key: 'action',
			render: (_): JSX.Element => (
				<Space value={8}>
					<Button
						type="text"
						style={{ padding: 0, cursor: 'pointer', color: blue[5] }}
						onClick={(): void => onVariableViewModeEnter('EDIT', _)}
					>
						Edit
					</Button>
					<Button
						type="text"
						style={{ padding: 0, color: red[6], cursor: 'pointer' }}
						onClick={(): void => {
							onVariableDeleteHandler(_.name);
						}}
					>
						Delete
					</Button>
				</Space>
			),
		},
	];

	return (
		<>
			{variableViewMode ? (
				<VariableItem
					variableData={{ ...variableEditData }}
					onSave={onVariableSaveHandler}
					onCancel={onDoneVariableViewMode}
					validateName={validateVariableName}
				/>
			) : (
				<>
					<Row style={{ flexDirection: 'row-reverse', padding: '0.5rem 0' }}>
						<Button
							type="primary"
							onClick={(): void => onVariableViewModeEnter('ADD', {})}
						>
							<PlusOutlined /> New Variables
						</Button>
					</Row>
					<Table columns={columns} dataSource={variablesTableData} />
				</>
			)}
			<Modal
				title="Delete variable"
				centered
				visible={deleteVariableModal}
				onOk={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			>
				Are you sure you want to delete variable{' '}
				<Tag>{variableToDelete.current}</Tag>?
			</Modal>
		</>
	);
}

interface DispatchProps {
	updateDashboardVariables: (
		props: Record<string, IDashboardVariable>,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateDashboardVariables: bindActionCreators(
		UpdateDashboardVariables,
		dispatch,
	),
	toggleEditMode: bindActionCreators(ToggleEditMode, dispatch),
});

export default connect(null, mapDispatchToProps)(VariablesSetting);
