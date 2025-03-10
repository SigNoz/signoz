/* eslint-disable sonarjs/no-identical-functions */
import { Button, Typography } from 'antd';
import ROUTES from 'constants/routes';
import { useGetDeploymentsData } from 'hooks/CustomDomain/useGetDeploymentsData';
import history from 'lib/history';
import { Globe, Link2 } from 'lucide-react';
import Card from 'periscope/components/Card/Card';
import { useEffect, useState } from 'react';

function DataSourceInfo(): JSX.Element {
	const notSendingData = false;
	const listeningToData = true;

	const {
		data: deploymentsData,
		isError: isErrorDeploymentsData,
	} = useGetDeploymentsData();

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
									history.push(ROUTES.GET_STARTED);
								}}
								onKeyDown={(e): void => {
									if (e.key === 'Enter') {
										history.push(ROUTES.GET_STARTED);
									}
								}}
							>
								Connect Data Source
							</Button>
						</div>

						{isErrorDeploymentsData && (
							<div className="workspace-details">
								<Typography>Error fetching data. Please try again later.</Typography>
							</div>
						)}

						{!isErrorDeploymentsData && deploymentsData && (
							<div className="workspace-details">
								<div className="workspace-region">
									<Globe size={10} />

									<Typography>{region}</Typography>
								</div>

								<div className="workspace-url">
									<Link2 size={12} />

									<Typography>{url}</Typography>
								</div>
							</div>
						)}
					</div>
				</Card.Content>
			</Card>
		</>
	);

	const renderListeningToData = (): JSX.Element => (
		<>
			<Typography className="welcome-title">Listening for data</Typography>

			<Typography className="welcome-description">
				Hold on a bit, it takes a little time for the data to start streaming in.
			</Typography>

			<Card className="welcome-card">
				<Card.Content>
					<div className="workspace-ready-container">
						<div className="workspace-ready-header">
							<Typography className="workspace-ready-title">
								<img src="/Icons/spinner.svg" alt="spinner" />
								Waiting for logs...
							</Typography>

							<Button
								role="button"
								tabIndex={0}
								onClick={(): void => {
									history.push(ROUTES.GET_STARTED);
								}}
								onKeyDown={(e): void => {
									if (e.key === 'Enter') {
										history.push(ROUTES.GET_STARTED);
									}
								}}
								type="default"
								className="periscope-btn secondary"
								icon={<img src="/Icons/play-back.svg" alt="play-back" />}
							>
								Retry sending data
							</Button>
						</div>

						{isErrorDeploymentsData && (
							<div className="workspace-details">
								<Typography>Error fetching data. Please try again later.</Typography>
							</div>
						)}

						{!isErrorDeploymentsData && deploymentsData && (
							<div className="workspace-details">
								<div className="workspace-region">
									<Globe size={10} />

									<Typography>{region}</Typography>
								</div>

								<div className="workspace-url">
									<Link2 size={12} />

									<Typography>{url}</Typography>
								</div>
							</div>
						)}
					</div>
				</Card.Content>
			</Card>
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

			{notSendingData && renderNotSendingData()}

			{listeningToData && renderListeningToData()}
		</div>
	);
}

export default DataSourceInfo;
