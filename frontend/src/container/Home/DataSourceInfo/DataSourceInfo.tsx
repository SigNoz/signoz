/* eslint-disable sonarjs/no-identical-functions */
import { useEffect, useState } from 'react';
import { Button, Skeleton, Tag, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { useGetHosts } from 'api/generated/services/zeus';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { Link2 } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useAppContext } from 'providers/App/App';
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

	const { data: hostsData, isError } = useGetHosts({
		query: { enabled: isEnabled || false },
	});

	const [url, setUrl] = useState<string>('');

	useEffect(() => {
		if (hostsData) {
			const defaultHost = hostsData?.data?.data?.hosts?.find((h) => h.is_default);
			if (defaultHost?.url) {
				const url = defaultHost?.url?.split('://')[1] ?? '';
				setUrl(url);
			}
		}
	}, [hostsData]);

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

						{!isError && hostsData && (
							<div className="workspace-details">
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

			{!isError && hostsData && (
				<Card className="welcome-card">
					<Card.Content>
						<div className="workspace-ready-container">
							<div className="workspace-details">
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
