import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { Button, Col, Flex, Modal, Row, Skeleton, Space } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { updateSubscription } from 'api/generated/services/subscriptions';
import RefreshPaymentStatus from 'components/RefreshPaymentStatus/RefreshPaymentStatus';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { SubscriptionManagePermissions } from 'lib/authz/hooks/useAuthZ/permissions/subscription.permissions';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import APIError from 'types/api/error';
import { LicensePlatform, LicenseState } from 'types/api/licensesV3/getActive';
import { getBaseUrl } from 'utils/basePath';

import featureGraphicCorrelationUrl from '@/assets/Images/feature-graphic-correlation.svg';

import './WorkspaceSuspended.styles.scss';

function WorkspaceSuspended(): JSX.Element {
	const { notifications } = useNotifications();
	const { activeLicense, isFetchingActiveLicense } = useAppContext();

	const { t } = useTranslation(['failedPayment']);

	const { mutate: manageCreditCard, isLoading } = useMutation(
		updateSubscription,
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
			url: getBaseUrl(),
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
										<Typography.Text className="workspace-suspended__details">
											{t('actionDescription')}
										</Typography.Text>
									</Space>
								</Col>
							</Row>
							<Row
								justify="center"
								align="middle"
								className="workspace-suspended__modal__cta"
								gutter={[8, 8]}
							>
								<Flex gap={8} justify="center" align="center">
									<AuthZTooltip
										checks={SubscriptionManagePermissions}
										withPortal={false}
									>
										<Button
											type="primary"
											shape="round"
											size="middle"
											loading={isLoading}
											onClick={handleUpdateCreditCard}
										>
											{t('continueMyJourney')}
										</Button>
									</AuthZTooltip>
									<RefreshPaymentStatus withPortal={false} />
								</Flex>
							</Row>
							<div className="workspace-suspended__creative">
								<img src={featureGraphicCorrelationUrl} alt="correlation-graphic" />
							</div>
						</>
					)}
				</div>
			</Modal>
		</div>
	);
}

export default WorkspaceSuspended;
