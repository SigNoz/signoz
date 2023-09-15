import { SaveOutlined } from '@ant-design/icons';
import { Col, Divider, Input, Space, Typography } from 'antd';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import AddTags from 'container/NewDashboard/DashboardSettings/General/AddTags';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from './styles';

function GeneralDashboardSettings(): JSX.Element {
	const { selectedDashboard, setSelectedDashboard } = useDashboard();

	const updateDashboardMutation = useUpdateDashboard();

	const selectedData = selectedDashboard?.data;

	const { title = '', tags = [], description = '' } = selectedData || {};

	const [updatedTitle, setUpdatedTitle] = useState<string>(title);
	const [updatedTags, setUpdatedTags] = useState<string[]>(tags || []);
	const [updatedDescription, setUpdatedDescription] = useState(
		description || '',
	);

	const { t } = useTranslation('common');

	const { notifications } = useNotifications();

	const onSaveHandler = (): void => {
		if (!selectedDashboard) return;

		updateDashboardMutation.mutateAsync(
			{
				...selectedDashboard,
				data: {
					...selectedDashboard.data,
					description: updatedDescription,
					tags: updatedTags,
					title: updatedTitle,
				},
			},
			{
				onSuccess: (updatedDashboard) => {
					if (updatedDashboard.payload) {
						setSelectedDashboard(updatedDashboard.payload);
					}
				},
				onError: () => {
					notifications.error({
						message: SOMETHING_WENT_WRONG,
					});
				},
			},
		);
	};

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
					<Button
						disabled={updateDashboardMutation.isLoading}
						loading={updateDashboardMutation.isLoading}
						icon={<SaveOutlined />}
						onClick={onSaveHandler}
						type="primary"
					>
						{t('save')}
					</Button>
				</div>
			</Space>
		</Col>
	);
}

export default GeneralDashboardSettings;
