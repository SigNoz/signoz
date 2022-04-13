import {
	EditOutlined,
	SaveOutlined,
	ShareAltOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Space, Tag, Typography } from 'antd';
import AddTags from 'container/NewDashboard/DescriptionOfDashboard/AddTags';
import NameOfTheDashboard from 'container/NewDashboard/DescriptionOfDashboard/NameOfTheDashboard';
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
import DashboardReducer from 'types/reducer/dashboards';

import Description from './Description';
import ShareModal from './ShareModal';
import { Button, Container } from './styles';

function DescriptionOfDashboard({
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

	const onClickEditHandler = useCallback(() => {
		if (isEditMode) {
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
		} else {
			toggleEditMode();
		}
	}, [
		isEditMode,
		updatedTitle,
		updatedTags,
		updatedDescription,
		selectedDashboard,
		toggleEditMode,
		updateDashboardTitleDescriptionTags,
	]);

	const onToggleHandler = (): void => {
		isIsJSONModalVisible((state) => !state);
	};

	return (
		<Card>
			<Row align="top" justify="space-between">
				{!isEditMode ? (
					<Col>
						<Typography>{title}</Typography>
						<Container>
							{tags?.map((e) => (
								<Tag key={e}>{e}</Tag>
							))}
						</Container>
						<Container>
							<Typography>{description}</Typography>
						</Container>
					</Col>
				) : (
					<Col lg={8}>
						<NameOfTheDashboard name={updatedTitle} setName={setUpdatedTitle} />
						<AddTags tags={updatedTags} setTags={setUpdatedTags} />
						<Description
							description={updatedDescription}
							setDescription={setUpdatedDescription}
						/>
					</Col>
				)}

				<ShareModal
					{...{
						isJSONModalVisible,
						onToggleHandler,
						selectedData,
					}}
				/>

				<Col>
					<Space direction="vertical">
						<Button onClick={onToggleHandler} icon={<ShareAltOutlined />}>
							{t('share')}
						</Button>
						<Button
							icon={!isEditMode ? <EditOutlined /> : <SaveOutlined />}
							onClick={onClickEditHandler}
						>
							{isEditMode ? t('save') : t('edit')}
						</Button>
					</Space>
				</Col>
			</Row>
		</Card>
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

export default connect(null, mapDispatchToProps)(DescriptionOfDashboard);
