import './WorkspaceAccessRestricted.styles.scss';

import { Button, Col, Modal, Row, Skeleton, Space, Typography } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useEffect } from 'react';
import { LicensePlatform, LicenseState } from 'types/api/licensesV3/getActive';

function WorkspaceAccessRestricted(): JSX.Element {
	const { activeLicense, isFetchingActiveLicense } = useAppContext();

	useEffect(() => {
		if (!isFetchingActiveLicense) {
			const isTerminated = activeLicense?.state === LicenseState.TERMINATED;
			const isExpired = activeLicense?.state === LicenseState.EXPIRED;
			const isCancelled = activeLicense?.state === LicenseState.CANCELLED;

			const isWorkspaceAccessRestricted = isTerminated || isExpired || isCancelled;

			if (
				!isWorkspaceAccessRestricted ||
				activeLicense.platform === LicensePlatform.SELF_HOSTED
			) {
				history.push(ROUTES.HOME);
			}
		}
	}, [isFetchingActiveLicense, activeLicense]);

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
					{isFetchingActiveLicense || !activeLicense ? (
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
											{activeLicense.state === LicenseState.TERMINATED && (
												<>
													Your SigNoz license is terminated, please contact support at{' '}
													<a href="mailto:cloud-support@signoz.io">
														cloud-support@signoz.io
													</a>{' '}
													for a new deployment
												</>
											)}
											{activeLicense.state === LicenseState.EXPIRED && (
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
											{activeLicense.state === LicenseState.CANCELLED && (
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
