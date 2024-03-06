/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable no-nested-ternary */
import './IntegrationDetailPage.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Typography } from 'antd';
import { useGetIntegration } from 'hooks/Integrations/useGetIntegration';
import { useGetIntegrationStatus } from 'hooks/Integrations/useGetIntegrationStatus';
import history from 'lib/history';
import { defaultTo } from 'lodash-es';
import { ArrowLeft, MoveUpRight, RotateCw } from 'lucide-react';
import { useEffect } from 'react';
import { isCloudUser } from 'utils/app';

import IntegrationDetailContent from './IntegrationDetailContent';
import IntegrationDetailHeader from './IntegrationDetailHeader';
import IntergrationsUninstallBar from './IntegrationsUninstallBar';
import { ConnectionStates } from './TestConnection';
import { getConnectionStatesFromConnectionStatus } from './utils';

interface IntegrationDetailPageProps {
	selectedIntegration: string;
	setSelectedIntegration: (id: string | null) => void;
	activeDetailTab: string;
}

function IntegrationDetailPage(props: IntegrationDetailPageProps): JSX.Element {
	const { selectedIntegration, setSelectedIntegration, activeDetailTab } = props;

	const handleContactSupport = (): void => {
		if (isCloudUser()) {
			history.push('/support');
		} else {
			window.open('https://signoz.io/slack', '_blank');
		}
	};
	const {
		data,
		isLoading,
		isFetching,
		refetch,
		isRefetching,
		isError,
	} = useGetIntegration({
		integrationId: selectedIntegration,
	});

	const {
		data: integrationStatus,
		refetch: refetchStatus,
		isLoading: isStatusLoading,
	} = useGetIntegrationStatus({
		integrationId: selectedIntegration,
		enabled: false,
	});

	const loading = isLoading || isFetching || isRefetching || isStatusLoading;
	const integrationData = data?.data.data;

	const connectionStatus = getConnectionStatesFromConnectionStatus(
		integrationData?.installation,
		defaultTo(
			integrationStatus?.data.data.connection_status,
			defaultTo(integrationData?.connection_status, { logs: null, metrics: null }),
		),
	);

	useEffect(() => {
		// we should once get data on load and then keep polling every 5 seconds
		refetchStatus();
		const timer = setInterval(() => {
			refetchStatus();
		}, 5000);

		return (): void => {
			clearInterval(timer);
		};
	}, [refetchStatus]);

	return (
		<div className="integration-detail-content">
			<Button
				type="text"
				icon={<ArrowLeft size={14} />}
				className="all-integrations-btn"
				onClick={(): void => {
					setSelectedIntegration(null);
				}}
			>
				All Integrations
			</Button>

			{loading ? (
				<div className="loading-integration-details">
					Please wait.. While we load the integration details
				</div>
			) : isError ? (
				<div className="error-container">
					<div className="error-content">
						<img
							src="/Icons/awwSnap.svg"
							alt="error-emoji"
							className="error-state-svg"
						/>
						<Typography.Text>
							Something went wrong :/ Refresh the page or contact support.
						</Typography.Text>
						<div className="error-btns">
							<Button
								type="primary"
								className="retry-btn"
								onClick={(): Promise<any> => refetch()}
								icon={<RotateCw size={14} />}
							>
								Retry
							</Button>
							<div className="contact-support" onClick={handleContactSupport}>
								<Typography.Link className="text">Contact Support </Typography.Link>

								<MoveUpRight size={14} color={Color.BG_ROBIN_400} />
							</div>
						</div>
					</div>
				</div>
			) : (
				integrationData && (
					<>
						<IntegrationDetailHeader
							id={selectedIntegration}
							title={defaultTo(integrationData?.title, '')}
							description={defaultTo(integrationData?.description, '')}
							icon={defaultTo(integrationData?.icon, '')}
							connectionState={connectionStatus}
							refetchIntegrationDetails={refetch}
						/>
						<IntegrationDetailContent
							activeDetailTab={activeDetailTab}
							integrationData={integrationData}
						/>

						{connectionStatus !== ConnectionStates.NotInstalled && (
							<IntergrationsUninstallBar
								integrationTitle={defaultTo(integrationData?.title, '')}
								integrationId={selectedIntegration}
								refetchIntegrationDetails={refetch}
							/>
						)}
					</>
				)
			)}
		</div>
	);
}

export default IntegrationDetailPage;
