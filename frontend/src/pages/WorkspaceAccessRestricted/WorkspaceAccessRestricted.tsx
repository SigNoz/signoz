import './WorkspaceAccessRestricted.styles.scss';

import { Button, Col, Modal, Row, Skeleton, Space, Typography } from 'antd';
import ROUTES from 'constants/routes';
import { useAppContext } from 'providers/App/App';
import { useEffect } from 'react';
import { LicensePlatform, LicenseState } from 'types/api/licensesV3/getActive';
import { safeNavigateNonComponentMemo } from 'utils/navigate';

function WorkspaceAccessRestricted(): JSX.Element {
	const { activeLicenseV3, isFetchingActiveLicenseV3 } = useAppContext();

	useEffect(() => {
		if (!isFetchingActiveLicenseV3) {
			const isTerminated = activeLicenseV3?.state === LicenseState.TERMINATED;
			const isExpired = activeLicenseV3?.state === LicenseState.EXPIRED;
			const isCancelled = activeLicenseV3?.state === LicenseState.CANCELLED;

			const isWorkspaceAccessRestricted = isTerminated || isExpired || isCancelled;

			if (
				!isWorkspaceAccessRestricted ||
				activeLicenseV3.platform === LicensePlatform.SELF_HOSTED
			) {
				safeNavigateNonComponentMemo(ROUTES.HOME);
			}
		}
	}, [isFetchingActiveLicenseV3, activeLicenseV3]);

	return (
		<div>
			<Modal
				rootClassName="workspace-access-restricted__modal"
				title={
					<div className="workspace-access-restricted__modal__header">
						<span className="workspace-access-restricted__modal__title">
							Your workspace access is restricted
						</span>
					</div>
				}
				open
				closable={false}
				footer={null}
				width="65%"
			>
				<div className="workspace-access-restricted__container">
					{isFetchingActiveLicenseV3 || !activeLicenseV3 ? (
						<Skeleton />
					) : (
						<>
							<Row justify="center" align="middle">
								<Col>
									<Space direction="vertical" align="center">
										<Typography.Title
											level={4}
											className="workspace-access-restricted__details"
										>
											{activeLicenseV3.state === LicenseState.TERMINATED && (
												<>
													Your SigNoz license is terminated, please contact support at{' '}
													<a href="mailto:cloud-support@signoz.io">
														cloud-support@signoz.io
													</a>{' '}
													for a new deployment
												</>
											)}
											{activeLicenseV3.state === LicenseState.EXPIRED && (
												<>
													Your SigNoz license is expired, please contact support at{' '}
													<a href="mailto:cloud-support@signoz.io">
														cloud-support@signoz.io
													</a>{' '}
													for renewal to avoid termination of license as per our{' '}
													<a
														href="https://signoz.io/terms-of-service"
														target="_blank"
														rel="noopener noreferrer"
													>
														terms of service
													</a>
													.
												</>
											)}
											{activeLicenseV3.state === LicenseState.CANCELLED && (
												<>
													Your SigNoz license is cancelled, please contact support at{' '}
													<a href="mailto:cloud-support@signoz.io">
														cloud-support@signoz.io
													</a>{' '}
													for reactivation to avoid termination of license as per our{' '}
													<a
														href="https://signoz.io/terms-of-service"
														target="_blank"
														rel="noopener noreferrer"
													>
														terms of service
													</a>
													.
												</>
											)}
										</Typography.Title>

										<Button
											type="default"
											shape="round"
											size="middle"
											href="mailto:cloud-support@signoz.io"
											role="button"
										>
											Contact Us
										</Button>
									</Space>
								</Col>
							</Row>
							<div className="workspace-access-restricted__creative">
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

export default WorkspaceAccessRestricted;
