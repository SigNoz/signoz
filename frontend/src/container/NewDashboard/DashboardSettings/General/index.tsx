import {
	EditOutlined,
	SaveOutlined,
	ShareAltOutlined,
} from '@ant-design/icons';
import { Card, Col, Divider, Input, Space, Tag, Typography } from 'antd';
import AddTags from 'container/NewDashboard/DashboardSettings/General/AddTags';
import NameOfTheDashboard from 'container/NewDashboard/DescriptionOfDashboard/NameOfTheDashboard';
import useComponentPermission from 'hooks/useComponentPermission';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	ToggleEditMode,
	UpdateDashboardTitleDescriptionTags,
	UpdateDashboardTitleDescriptionTagsProps,
} from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';

import Description from './Description';
import ShareModal from '../../DescriptionOfDashboard/ShareModal';
import { Button, Container } from './styles';

function GeneralDashboardSettings({
	updateDashboardTitleDescriptionTags,
	toggleEditMode,
}: DescriptionOfDashboardProps): JSX.Element {
	const { dashboards, isEditMode } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [selectedDashboard] = dashboards;
	const selectedData = selectedDashboard.data;
	const { title } = selectedData;
	const { tags } = selectedData;
	const { description } = selectedData;

	const [updatedTitle, setUpdatedTitle] = useState<string>(title);
	const [updatedTags, setUpdatedTags] = useState<string[]>(tags || []);
	const [updatedDescription, setUpdatedDescription] = useState(
		description || '',
	);
	const [isJSONModalVisible, isIsJSONModalVisible] = useState<boolean>(false);

	const { t } = useTranslation('common');
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const [editDashboard] = useComponentPermission(['edit_dashboard'], role);

	const onSaveHandler = useCallback(() => {
		const dashboard = selectedDashboard;
		// @TODO need to update this function to take title,description,tags only
		updateDashboardTitleDescriptionTags({
			dashboard: {
				...dashboard,
				data: {
					...dashboard.data,
					description: updatedDescription,
					tags: updatedTags,
					title: updatedTitle,
				},
			},
		});
	}, [
		updatedTitle,
		updatedTags,
		updatedDescription,
		selectedDashboard,
		updateDashboardTitleDescriptionTags,
	]);

	// const onToggleHandler = (): void => {
	// 	isIsJSONModalVisible((state) => !state);
	// };

	return (
		<>
			<Col>
				<Space direction="vertical" style={{ width: '100%' }}>
					<div>
						<Typography style={{ marginBottom: '0.5rem' }}>Name</Typography>
						<Input value={updatedTitle} onChange={(e) => setUpdatedTitle(e.target.value)} />
					</div>

					<div>
						<Typography style={{ marginBottom: '0.5rem' }}>Description</Typography>
						<Input.TextArea value={updatedDescription} onChange={(e) => setUpdatedDescription(e.target.value)} />
					</div>
					<div>
						<Typography style={{ marginBottom: '0.5rem' }}>Tags</Typography>
						<AddTags tags={updatedTags} setTags={setUpdatedTags} />
					</div>
					<div>
						<Divider />
						<Button icon={<SaveOutlined />} onClick={onSaveHandler} type="primary">
							{t('save')}
						</Button>
					</div>

				</Space>
			</Col>




			{/* <Col lg={8}>
				<NameOfTheDashboard name={updatedTitle} setName={setUpdatedTitle} />

				<Description
					description={updatedDescription}
					setDescription={setUpdatedDescription}
				/>
			</Col> */}
			

		</>
	);
}

interface DispatchProps {
	updateDashboardTitleDescriptionTags: (
		props: UpdateDashboardTitleDescriptionTagsProps,
	) => (dispatch: Dispatch<AppActions>) => void;
	toggleEditMode: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateDashboardTitleDescriptionTags: bindActionCreators(
		UpdateDashboardTitleDescriptionTags,
		dispatch,
	),
	toggleEditMode: bindActionCreators(ToggleEditMode, dispatch),
});

type DescriptionOfDashboardProps = DispatchProps;

export default connect(null, mapDispatchToProps)(GeneralDashboardSettings);
