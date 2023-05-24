import { blue, red } from '@ant-design/colors';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Modal, Row, Space, Tag } from 'antd';
import { NotificationInstance } from 'antd/es/notification/interface';
import { ResizeTable } from 'components/ResizeTable';
import { useNotifications } from 'hooks/useNotifications';
import { useRef, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
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

	const { notifications } = useNotifications();

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

	const [
		variableEditData,
		setVariableEditData,
	] = useState<null | IDashboardVariable>(null);

	const onDoneVariableViewMode = (): void => {
		setVariableViewMode(null);
		setVariableEditData(null);
	};

	const onVariableViewModeEnter = (
		viewType: TVariableViewMode,
		varData: IDashboardVariable,
	): void => {
		setVariableEditData(varData);
		setVariableViewMode(viewType);
	};

	const onVariableSaveHandler = (
		name: string,
		variableData: IDashboardVariable,
		oldName: string,
	): void => {
		if (!variableData.name) {
			return;
		}

		const newVariables = { ...variables };
		newVariables[name] = variableData;

		if (oldName) {
			delete newVariables[oldName];
		}
		updateDashboardVariables(newVariables, notifications);
		onDoneVariableViewMode();
	};

	const onVariableDeleteHandler = (variableName: string): void => {
		variableToDelete.current = variableName;
		setDeleteVariableModal(true);
	};

	const handleDeleteConfirm = (): void => {
		const newVariables = { ...variables };
		if (variableToDelete?.current) delete newVariables[variableToDelete?.current];
		updateDashboardVariables(newVariables, notifications);
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
			title: 'Definition',
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
						style={{ padding: 0, cursor: 'pointer', color: blue[5] }}
						onClick={(): void => onVariableViewModeEnter('EDIT', _)}
					>
						Edit
					</Button>
					<Button
						type="text"
						style={{ padding: 0, color: red[6], cursor: 'pointer' }}
						onClick={(): void => {
							if (_.name) onVariableDeleteHandler(_.name);
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
					variableData={{ ...variableEditData } as IDashboardVariable}
					existingVariables={variables}
					onSave={onVariableSaveHandler}
					onCancel={onDoneVariableViewMode}
					validateName={validateVariableName}
					variableViewMode={variableViewMode}
				/>
			) : (
				<>
					<Row style={{ flexDirection: 'row-reverse', padding: '0.5rem 0' }}>
						<Button
							type="primary"
							onClick={(): void =>
								onVariableViewModeEnter('ADD', {} as IDashboardVariable)
							}
						>
							<PlusOutlined /> New Variables
						</Button>
					</Row>
					<ResizeTable columns={columns} dataSource={variablesTableData} />
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

interface DispatchProps {
	updateDashboardVariables: (
		props: Record<string, IDashboardVariable>,
		notify: NotificationInstance,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateDashboardVariables: bindActionCreators(
		UpdateDashboardVariables,
		dispatch,
	),
});

export default connect(null, mapDispatchToProps)(VariablesSetting);
