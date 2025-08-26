import './WorkspaceSuspended.styles.scss';

import {
	Alert,
	Button,
	Col,
	Flex,
	Modal,
	Row,
	Skeleton,
	Space,
	Typography,
} from 'antd';
import manageCreditCardApi from 'api/v1/portal/create';
import RefreshPaymentStatus from 'components/RefreshPaymentStatus/RefreshPaymentStatus';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import APIError from 'types/api/error';
import { LicensePlatform, LicenseState } from 'types/api/licensesV3/getActive';
import { getFormattedDateWithMinutes } from 'utils/timeUtils';

function WorkspaceSuspended(): JSX.Element {
	const { user } = useAppContext();
	const isAdmin = user.role === 'ADMIN';
	const { notifications } = useNotifications();
	const { activeLicense, isFetchingActiveLicense } = useAppContext();

	const { t } = useTranslation(['failedPayment']);

	const { mutate: manageCreditCard, isLoading } = useMutation(
		manageCreditCardApi,
		{
			onSuccess: (data) => {
				if (data.data?.redirectURL) {
					const newTab = document.createElement('a');
					newTab.href = data.data.redirectURL;
					newTab.target = '_blank';
					newTab.rel = 'noopener noreferrer';
					newTab.click();
				}
			},
			onError: (error: APIError) =>
				notifications.error({
					message: error.getErrorCode(),
					description: error.getErrorMessage(),
				}),
		},
	);

	const handleUpdateCreditCard = useCallback(async () => {
		manageCreditCard({
			url: window.location.origin,
		});
	}, [manageCreditCard]);

	useEffect(() => {
		if (!isFetchingActiveLicense) {
			const shouldSuspendWorkspace =
				activeLicense?.state === LicenseState.DEFAULTED;

			if (
				!shouldSuspendWorkspace ||
				activeLicense?.platform === LicensePlatform.SELF_HOSTED
			) {
				history.push(ROUTES.HOME);
			}
		}
	}, [isFetchingActiveLicense, activeLicense]);
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
					{isFetchingActiveLicense || !activeLicense ? (
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
													dayjs(activeLicense?.event_queue?.scheduled_at).unix() ||
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
									gutter={[8, 8]}
								>
									<Flex gap={8} justify="center" align="center">
										<Button
											type="primary"
											shape="round"
											size="middle"
											loading={isLoading}
											onClick={handleUpdateCreditCard}
										>
											{t('continueMyJourney')}
										</Button>
										<RefreshPaymentStatus btnShape="round" />
									</Flex>
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
