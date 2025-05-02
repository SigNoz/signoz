import '../../pages/Integrations/Integrations.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import { Button, Input, Space, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { useNotifications } from 'hooks/useNotifications';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function RequestDashboardBtn(): JSX.Element {
	const [
		isSubmittingRequestForDashboard,
		setIsSubmittingRequestForDashboard,
	] = useState(false);

	const [requestedDashboardName, setRequestedDashboardName] = useState('');

	const { notifications } = useNotifications();
	const { t } = useTranslation(['common']);

	const handleRequestDashboardSubmit = async (): Promise<void> => {
		try {
			setIsSubmittingRequestForDashboard(true);
			const response = await logEvent('Dashboard Requested', {
				screen: 'Dashboard list page',
				dashboard: requestedDashboardName,
			});

			if (response.statusCode === 200) {
				notifications.success({
					message: 'Dashboard Request Submitted',
				});

				setIsSubmittingRequestForDashboard(false);
			} else {
				notifications.error({
					message:
						response.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});

				setIsSubmittingRequestForDashboard(false);
			}
		} catch (error) {
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});

			setIsSubmittingRequestForDashboard(false);
		}
	};

	return (
		<div className="request-entity-container">
			<Typography.Text>
				Can&apos;t find the dashboard you need? Request a new Dashboard.
			</Typography.Text>

			<div className="form-section">
				<Space.Compact style={{ width: '100%' }}>
					<Input
						placeholder="Enter dashboard name..."
						style={{ width: 300, marginBottom: 0 }}
						value={requestedDashboardName}
						onChange={(e): void => setRequestedDashboardName(e.target.value)}
					/>
					<Button
						className="periscope-btn primary"
						icon={
							isSubmittingRequestForDashboard ? (
								<LoadingOutlined />
							) : (
								<Check size={12} />
							)
						}
						type="primary"
						onClick={handleRequestDashboardSubmit}
						disabled={
							isSubmittingRequestForDashboard ||
							!requestedDashboardName ||
							requestedDashboardName?.trim().length === 0
						}
					>
						Submit
					</Button>
				</Space.Compact>
			</div>
		</div>
	);
}
