import './GeneralSettings.styles.scss';

import { Col, Input, Space, Typography } from 'antd';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import AddTags from 'container/NewDashboard/DashboardSettings/General/AddTags';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
import { Check, X } from 'lucide-react';
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
		<div className="overview-content">
			<Col className="overview-settings">
				<Space
					direction="vertical"
					style={{
						width: '100%',
						display: 'flex',
						flexDirection: 'column',
						gap: '21px',
					}}
				>
					<div>
						<Typography style={{ marginBottom: '0.5rem' }} className="dashboard-name">
							Dashboard Name
						</Typography>
						<Input
							data-testid="dashboard-name"
							className="dashboard-name-input"
							value={updatedTitle}
							onChange={(e): void => setUpdatedTitle(e.target.value)}
						/>
					</div>

					<div>
						<Typography style={{ marginBottom: '0.5rem' }} className="dashboard-name">
							Description
						</Typography>
						<Input.TextArea
							data-testid="dashboard-desc"
							rows={6}
							value={updatedDescription}
							className="description-text-area"
							onChange={(e): void => setUpdatedDescription(e.target.value)}
						/>
					</div>
					<div>
						<Typography style={{ marginBottom: '0.5rem' }} className="dashboard-name">
							Tags
						</Typography>
						<AddTags tags={updatedTags} setTags={setUpdatedTags} />
					</div>
				</Space>
			</Col>
			<div className="overview-settings-footer">
				<div className="unsaved">
					<div className="unsaved-dot" />
					<Typography.Text className="unsaved-changes">
						1 Unsaved change
					</Typography.Text>
				</div>
				<div className="footer-action-btns">
					<Button
						style={{
							margin: '16px 0',
						}}
						disabled={updateDashboardMutation.isLoading}
						loading={updateDashboardMutation.isLoading}
						icon={<X size={14} />}
						onClick={onSaveHandler}
						type="text"
						className="discard-btn"
					>
						Discard
					</Button>
					<Button
						style={{
							margin: '16px 0',
						}}
						disabled={updateDashboardMutation.isLoading}
						loading={updateDashboardMutation.isLoading}
						icon={<Check size={14} />}
						data-testid="save-dashboard-config"
						onClick={onSaveHandler}
						type="primary"
						className="save-btn"
					>
						{t('save')}
					</Button>
				</div>
			</div>
		</div>
	);
}

export default GeneralDashboardSettings;
