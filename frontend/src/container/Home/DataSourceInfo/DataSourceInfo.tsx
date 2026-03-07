import { useMemo } from 'react';
import { Button } from '@signozhq/button';
import { Skeleton } from 'antd';
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

	const activeHost = useMemo(
		() =>
			hostsData?.data?.hosts?.find((h) => !h.is_default) ??
			hostsData?.data?.hosts?.find((h) => h.is_default),
		[hostsData],
	);

	const url = useMemo(() => activeHost?.url?.split('://')[1] ?? '', [
		activeHost,
	]);

	const handleConnect = (): void => {
		logEvent('Homepage: Connect dataSource clicked', {});

		if (activeLicense && activeLicense.platform === LicensePlatform.CLOUD) {
			history.push(ROUTES.GET_STARTED_WITH_CLOUD);
		} else {
			window?.open(DOCS_LINKS.ADD_DATA_SOURCE, '_blank', 'noopener noreferrer');
		}
	};

	const renderNotSendingData = (): JSX.Element => (
		<>
			<h2 className="welcome-title">
				Hello there, Welcome to your SigNoz workspace
			</h2>

			<p className="welcome-description">
				You’re not sending any data yet. <br />
				SigNoz is so much better with your data ⎯ start by sending your telemetry
				data to SigNoz.
			</p>

			<Card className="welcome-card">
				<Card.Content>
					<div className="workspace-ready-container">
						<div className="workspace-ready-header">
							<span className="workspace-ready-title">
								<img src="/Icons/hurray.svg" alt="hurray" />
								Your workspace is ready
							</span>

							<Button
								variant="solid"
								color="primary"
								size="sm"
								className="periscope-btn primary"
								prefixIcon={<img src="/Icons/container-plus.svg" alt="plus" />}
								onClick={handleConnect}
								role="button"
								tabIndex={0}
								onKeyDown={(e): void => {
									if (e.key === 'Enter') {
										handleConnect();
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

									<span className="workspace-url-text">{url}</span>
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
			<h2 className="welcome-title">
				Hello there, Welcome to your SigNoz workspace
			</h2>

			{!isError && hostsData && (
				<Card className="welcome-card">
					<Card.Content>
						<div className="workspace-ready-container">
							<div className="workspace-details">
								<div className="workspace-url">
									<Link2 size={12} />

									<span className="workspace-url-text">{url}</span>
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
