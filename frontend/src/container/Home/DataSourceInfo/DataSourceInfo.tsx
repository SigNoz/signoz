/* eslint-disable sonarjs/no-identical-functions */
import { Button, Skeleton, Tag, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import { useGetDeploymentsData } from 'hooks/CustomDomain/useGetDeploymentsData';
import history from 'lib/history';
import { Globe, Link2 } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
import { useEffect, useState } from 'react';
import { LicensePlatform } from 'types/api/licensesV3/getActive';

import { DOCS_LINKS } from '../constants';

function DataSourceInfo({
	dataSentToSigNoz,
	isLoading,
}: {
	dataSentToSigNoz: boolean;
	isLoading: boolean;
}): JSX.Element {
	const { activeLicense } = useAppContext();

	const notSendingData = !dataSentToSigNoz;

	const isEnabled =
		activeLicense && activeLicense.platform === LicensePlatform.CLOUD;

	const {
		data: deploymentsData,
		isError: isErrorDeploymentsData,
	} = useGetDeploymentsData(isEnabled || false);

	const [region, setRegion] = useState<string>('');
	const [url, setUrl] = useState<string>('');

	useEffect(() => {
		if (deploymentsData) {
			switch (deploymentsData?.data.data.cluster.region.name) {
				case 'in':
					setRegion('India');
					break;
				case 'us':
					setRegion('United States');
					break;
				case 'eu':
					setRegion('Europe');
					break;
				default:
					setRegion(deploymentsData?.data.data.cluster.region.name);
					break;
			}

			setUrl(
				`${deploymentsData?.data.data.name}.${deploymentsData?.data.data.cluster.region.dns}`,
			);
		}
	}, [deploymentsData]);

	const renderNotSendingData = (): JSX.Element => (
		<>
			<Typography className="welcome-title">
				Hello there, Welcome to your SigNoz workspace
			</Typography>

			<Typography className="welcome-description">
				You’re not sending any data yet. <br />
				SigNoz is so much better with your data ⎯ start by sending your telemetry
				data to SigNoz.
			</Typography>

			<Card className="welcome-card">
				<Card.Content>
					<div className="workspace-ready-container">
						<div className="workspace-ready-header">
							<Typography className="workspace-ready-title">
								<img src="/Icons/hurray.svg" alt="hurray" />
								Your workspace is ready
							</Typography>

							<Button
								type="primary"
								className="periscope-btn primary"
								icon={<img src="/Icons/container-plus.svg" alt="plus" />}
								role="button"
								tabIndex={0}
								onClick={(): void => {
									logEvent('Homepage: Connect dataSource clicked', {});

									if (
										activeLicense &&
										activeLicense.platform === LicensePlatform.CLOUD
									) {
										history.push(ROUTES.GET_STARTED_WITH_CLOUD);
									} else {
										window?.open(
											DOCS_LINKS.ADD_DATA_SOURCE,
											'_blank',
											'noopener noreferrer',
										);
									}
								}}
								onKeyDown={(e): void => {
									if (e.key === 'Enter') {
										logEvent('Homepage: Connect dataSource clicked', {});

										if (
											activeLicense &&
											activeLicense.platform === LicensePlatform.CLOUD
										) {
											history.push(ROUTES.GET_STARTED_WITH_CLOUD);
										} else {
											window?.open(
												DOCS_LINKS.ADD_DATA_SOURCE,
												'_blank',
												'noopener noreferrer',
											);
										}
									}
								}}
							>
								Connect Data Source
							</Button>
						</div>

						{!isErrorDeploymentsData && deploymentsData && (
							<div className="workspace-details">
								<div className="workspace-region">
									<Globe size={10} />

									<Typography>{region}</Typography>
								</div>

								<div className="workspace-url">
									<Link2 size={12} />

									<Typography className="workspace-url-text">
										{url}

										<Tag color="default" className="workspace-url-tag">
											default
										</Tag>
									</Typography>
								</div>
							</div>
						)}
					</div>
				</Card.Content>
			</Card>
		</>
	);

	const renderDataReceived = (): JSX.Element => (
		<>
			<Typography className="welcome-title">
				Hello there, Welcome to your SigNoz workspace
			</Typography>

			{!isErrorDeploymentsData && deploymentsData && (
				<Card className="welcome-card">
					<Card.Content>
						<div className="workspace-ready-container">
							<div className="workspace-details">
								<div className="workspace-region">
									<Globe size={10} />

									<Typography>{region}</Typography>
								</div>

								<div className="workspace-url">
									<Link2 size={12} />

									<Typography className="workspace-url-text">
										{url}

										<Tag color="default" className="workspace-url-tag">
											default
										</Tag>
									</Typography>
								</div>
							</div>
						</div>
					</Card.Content>
				</Card>
			)}
		</>
	);

	return (
		<div className="welcome-container">
			<div className="hello-wave-container">
				<div className="hello-wave-img-container">
					<img
						src="/Icons/hello-wave.svg"
						alt="hello-wave"
						className="hello-wave-img"
						width={36}
						height={36}
					/>
				</div>
			</div>

			{isLoading && (
				<>
					<Skeleton.Avatar active size={36} shape="square" />
					<Skeleton active />
				</>
			)}

			{!isLoading && dataSentToSigNoz && renderDataReceived()}

			{!isLoading && notSendingData && renderNotSendingData()}
		</div>
	);
}

export default DataSourceInfo;
