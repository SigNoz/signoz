import './WorkspaceSuspended.styles.scss';

import {
	Alert,
	Button,
	Col,
	Modal,
	Row,
	Skeleton,
	Space,
	Typography,
} from 'antd';
import manageCreditCardApi from 'api/billing/manage';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { LicenseState, LicenseStatus } from 'types/api/licensesV3/getActive';
import { getFormattedDateWithMinutes } from 'utils/timeUtils';

function WorkspaceSuspended(): JSX.Element {
	const { user } = useAppContext();
	const isAdmin = user.role === 'ADMIN';
	const { notifications } = useNotifications();
	const { activeLicenseV3, isFetchingActiveLicenseV3 } = useAppContext();

	const { t } = useTranslation(['failedPayment']);

	const { mutate: manageCreditCard, isLoading } = useMutation(
		manageCreditCardApi,
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
					message: t('somethingWentWrong'),
				}),
		},
	);

	const handleUpdateCreditCard = useCallback(async () => {
		manageCreditCard({
			licenseKey: activeLicenseV3?.key || '',
			successURL: window.location.origin,
			cancelURL: window.location.origin,
		});
	}, [activeLicenseV3?.key, manageCreditCard]);

	useEffect(() => {
		if (!isFetchingActiveLicenseV3 && activeLicenseV3) {
			const shouldSuspendWorkspace =
				activeLicenseV3.status === LicenseStatus.SUSPENDED &&
				activeLicenseV3.state === LicenseState.DEFAULTED;

			if (!shouldSuspendWorkspace) {
				history.push(ROUTES.APPLICATION);
			}
		}
	}, [isFetchingActiveLicenseV3, activeLicenseV3]);
	return (
		<div>
			<Modal
				rootClassName="workspace-suspended__modal"
				title={
					<div className="workspace-suspended__modal__header">
						<span className="workspace-suspended__modal__title">
							{t('workspaceSuspended')}
						</span>
						<span className="workspace-suspended__modal__header__actions">
							<Typography.Text className="workspace-suspended__modal__title">
								Got Questions?
							</Typography.Text>
							<Button
								type="default"
								shape="round"
								size="middle"
								href="mailto:cloud-support@signoz.io"
								role="button"
							>
								Contact Us
							</Button>
						</span>
					</div>
				}
				open
				closable={false}
				footer={null}
				width="65%"
			>
				<div className="workspace-suspended__container">
					{isFetchingActiveLicenseV3 || !activeLicenseV3 ? (
						<Skeleton />
					) : (
						<>
							<Row justify="center" align="middle">
								<Col>
									<Space direction="vertical" align="center">
										<Typography.Title level={2}>
											<div className="workspace-suspended__title">{t('actionHeader')}</div>
										</Typography.Title>
										<Typography.Paragraph className="workspace-suspended__details">
											{t('actionDescription')}
											<br />
											{t('yourDataIsSafe')}{' '}
											<span className="workspace-suspended__details__highlight">
												{getFormattedDateWithMinutes(
													dayjs(activeLicenseV3?.event_queue?.scheduled_at).unix() ||
														Date.now(),
												)}
											</span>{' '}
											{t('actNow')}
										</Typography.Paragraph>
									</Space>
								</Col>
							</Row>
							{!isAdmin && (
								<Row
									justify="center"
									align="middle"
									className="workspace-suspended__modal__cta"
									gutter={[16, 16]}
								>
									<Col>
										<Alert
											message="Contact your admin to proceed with the upgrade."
											type="info"
										/>
									</Col>
								</Row>
							)}
							{isAdmin && (
								<Row
									justify="center"
									align="middle"
									className="workspace-suspended__modal__cta"
									gutter={[16, 16]}
								>
									<Col>
										<Button
											type="primary"
											shape="round"
											size="middle"
											loading={isLoading}
											onClick={handleUpdateCreditCard}
										>
											{t('continueMyJourney')}
										</Button>
									</Col>
								</Row>
							)}
							<div className="workspace-suspended__creative">
								<img
									src="/Images/feature-graphic-correlation.svg"
									alt="correlation-graphic"
								/>
							</div>
						</>
					)}
				</div>
			</Modal>
		</div>
	);
}

export default WorkspaceSuspended;
