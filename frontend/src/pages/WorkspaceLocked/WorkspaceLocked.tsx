/* eslint-disable react/no-unescaped-entities */
import './WorkspaceLocked.styles.scss';

import {
	CreditCardOutlined,
	LockOutlined,
	SendOutlined,
} from '@ant-design/icons';
import { Button, Card, Skeleton, Typography } from 'antd';
import updateCreditCardApi from 'api/billing/checkout';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import ROUTES from 'constants/routes';
import FullScreenHeader from 'container/FullScreenHeader/FullScreenHeader';
import useAnalytics from 'hooks/analytics/useAnalytics';
import useLicense from 'hooks/useLicense';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { License } from 'types/api/licenses/def';
import AppReducer from 'types/reducer/app';
import { getFormattedDate } from 'utils/timeUtils';

export default function WorkspaceBlocked(): JSX.Element {
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const isAdmin = role === 'ADMIN';
	const [activeLicense, setActiveLicense] = useState<License | null>(null);
	const { trackEvent } = useAnalytics();

	const { notifications } = useNotifications();

	const {
		isFetching: isFetchingLicenseData,
		isLoading: isLoadingLicenseData,
		data: licensesData,
	} = useLicense();

	useEffect(() => {
		if (!isFetchingLicenseData) {
			const shouldBlockWorkspace = licensesData?.payload?.workSpaceBlock;

			if (!shouldBlockWorkspace) {
				history.push(ROUTES.APPLICATION);
			}

			const activeValidLicense =
				licensesData?.payload?.licenses?.find(
					(license) => license.isCurrent === true,
				) || null;

			setActiveLicense(activeValidLicense);
		}
	}, [isFetchingLicenseData, licensesData]);

	const { mutate: updateCreditCard, isLoading } = useMutation(
		updateCreditCardApi,
		{
			onSuccess: (data) => {
				if (data.payload?.redirectURL) {
					const newTab = document.createElement('a');
					newTab.href = data.payload.redirectURL;
					newTab.target = '_blank';
					newTab.rel = 'noopener noreferrer';
					newTab.click();
				}
			},
			onError: () =>
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				}),
		},
	);

	const handleUpdateCreditCard = useCallback(async () => {
		trackEvent('Workspace Blocked: User Clicked Update Credit Card');

		updateCreditCard({
			licenseKey: activeLicense?.key || '',
			successURL: window.location.origin,
			cancelURL: window.location.origin,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeLicense?.key, updateCreditCard]);

	const handleExtendTrial = (): void => {
		trackEvent('Workspace Blocked: User Clicked Extend Trial');

		const recipient = 'cloud-support@signoz.io';
		const subject = 'Extend SigNoz Cloud Trial';
		const body = `I'd like to request an extension for SigNoz Cloud for my account. Please find my account details below
		
		SigNoz URL: 
		Admin Email:
		`;

		// Create the mailto link
		const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(
			subject,
		)}&body=${encodeURIComponent(body)}`;

		// Open the default email client
		window.location.href = mailtoLink;
	};

	return (
		<>
			<FullScreenHeader overrideRoute={ROUTES.WORKSPACE_LOCKED} />

			<Card className="workspace-locked-container">
				{isLoadingLicenseData || !licensesData?.payload?.workSpaceBlock ? (
					<Skeleton />
				) : (
					<>
						<LockOutlined style={{ fontSize: '36px', color: '#08c' }} />
						<Typography.Title level={4}> Workspace Locked </Typography.Title>
						<Typography.Paragraph className="workpace-locked-details">
							You have been locked out of your workspace because your trial ended
							without an upgrade to a paid plan. Your data will continue to be ingested
							till{' '}
							{getFormattedDate(licensesData?.payload?.gracePeriodEnd || Date.now())} ,
							at which point we will drop all the ingested data and terminate the
							account.
							{!isAdmin && 'Please contact your administrator for further help'}
						</Typography.Paragraph>

						<div className="cta">
							{isAdmin && (
								<Button
									className="update-credit-card-btn"
									type="primary"
									icon={<CreditCardOutlined />}
									size="middle"
									loading={isLoading}
									onClick={handleUpdateCreditCard}
								>
									Update Credit Card
								</Button>
							)}

							<Button
								className="extend-trial-btn"
								type="default"
								icon={<SendOutlined />}
								size="middle"
								onClick={handleExtendTrial}
							>
								Extend Trial
							</Button>
						</div>
						<div className="contact-us">
							Got Questions?
							<span>
								<a href="mailto:support@signoz.io"> Contact Us </a>
							</span>
						</div>
					</>
				)}
			</Card>
		</>
	);
}
