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
import updateCreditCardApi from 'api/billing/checkout';
import { useNotifications } from 'hooks/useNotifications';
import { useAppContext } from 'providers/App/App';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { getFormattedDate } from 'utils/timeUtils';

function WorkspaceSuspended(): JSX.Element {
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);
	const isAdmin = role === 'ADMIN';
	const { notifications } = useNotifications();
	const { activeLicenseV3, isFetchingActiveLicenseV3 } = useAppContext();

	const { t } = useTranslation(['failedPayment']);

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
					message: t('somethingWentWrong'),
				}),
		},
	);

	const handleUpdateCreditCard = useCallback(async () => {
		updateCreditCard({
			licenseKey: activeLicenseV3?.key || '',
			successURL: window.location.origin,
			cancelURL: window.location.origin,
		});
	}, [activeLicenseV3?.key, updateCreditCard]);
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
												{getFormattedDate(Date.now())}
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
						</>
					)}
				</div>
			</Modal>
		</div>
	);
}

export default WorkspaceSuspended;
