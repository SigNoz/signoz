/* eslint-disable react/no-unescaped-entities */
import './WorkspaceLocked.styles.scss';

import { CreditCardOutlined, LockOutlined } from '@ant-design/icons';
import { Button, Card, Typography } from 'antd';
import updateCreditCardApi from 'api/billing/checkout';
import { getFormattedDate } from 'container/BillingContainer/BillingContainer';
import useLicense from 'hooks/useLicense';
import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { License } from 'types/api/licenses/def';
import AppReducer from 'types/reducer/app';

export default function WorkspaceBlocked(): JSX.Element {
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const isAdmin = role === 'ADMIN';
	const [activeLicense, setActiveLicense] = useState<License | null>(null);

	const { isFetching, data: licensesData } = useLicense();

	useEffect(() => {
		const activeValidLicense =
			licensesData?.payload?.licenses?.find(
				(license) => license.isCurrent === true,
			) || null;

		setActiveLicense(activeValidLicense);
	}, [isFetching, licensesData]);

	const { mutate: updateCreditCard, isLoading } = useMutation(
		updateCreditCardApi,
		{
			onSuccess: (data) => {
				window.open(data.payload?.redirectURL);
			},
			onError: () => console.log('error'),
		},
	);

	const handleUpdateCreditCard = useCallback(async () => {
		updateCreditCard({
			licenseKey: activeLicense?.key || '',
			successURL: window.location.origin,
			cancelURL: window.location.origin,
		});
	}, [activeLicense?.key, updateCreditCard]);

	return (
		<Card className="workspace-locked-container">
			<LockOutlined style={{ fontSize: '36px', color: '#08c' }} />
			<Typography.Title level={4}> Workspace Locked </Typography.Title>

			<Typography.Paragraph className="workpace-locked-details">
				You have been locked out of your workspace because your trial ended without
				an upgrade to a paid plan. Your data will continue to be ingested till{' '}
				{getFormattedDate(licensesData?.payload?.gracePeriodEnd)} , at which point
				we will drop all the ingested data and terminate the account.
				{!isAdmin && 'Please contact your administrator for further help'}
			</Typography.Paragraph>

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

			<div className="contact-us">
				Got Questions?
				<span>
					<a href="mailto:support@signoz.io"> Contact Us </a>
				</span>
			</div>
		</Card>
	);
}
