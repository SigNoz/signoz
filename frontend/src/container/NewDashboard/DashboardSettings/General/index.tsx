import { SaveOutlined } from '@ant-design/icons';
import { Col, Divider, Input, Space, Typography } from 'antd';
import AddTags from 'container/NewDashboard/DashboardSettings/General/AddTags';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	UpdateDashboardTitleDescriptionTags,
	UpdateDashboardTitleDescriptionTagsProps,
} from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import DashboardReducer from 'types/reducer/dashboards';

import { Button } from './styles';

function GeneralDashboardSettings({
	updateDashboardTitleDescriptionTags,
}: DescriptionOfDashboardProps): JSX.Element {
	const { dashboards } = useSelector<AppState, DashboardReducer>(
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

	const { t } = useTranslation('common');

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

	return (
		<Col>
			<Space direction="vertical" style={{ width: '100%' }}>
				<div>
					<Typography style={{ marginBottom: '0.5rem' }}>Name</Typography>
					<Input
						value={updatedTitle}
						onChange={(e): void => setUpdatedTitle(e.target.value)}
					/>
				</div>

				<div>
					<Typography style={{ marginBottom: '0.5rem' }}>Description</Typography>
					<Input.TextArea
						value={updatedDescription}
						onChange={(e): void => setUpdatedDescription(e.target.value)}
					/>
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
	);
}

interface DispatchProps {
	updateDashboardTitleDescriptionTags: (
		props: UpdateDashboardTitleDescriptionTagsProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateDashboardTitleDescriptionTags: bindActionCreators(
		UpdateDashboardTitleDescriptionTags,
		dispatch,
	),
});

type DescriptionOfDashboardProps = DispatchProps;

export default connect(null, mapDispatchToProps)(GeneralDashboardSettings);
