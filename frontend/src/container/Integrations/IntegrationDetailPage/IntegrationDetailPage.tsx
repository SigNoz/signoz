import { Color } from '@signozhq/design-tokens';
import { Button, Flex, Typography } from 'antd';
import { useGetIntegration } from 'hooks/Integrations/useGetIntegration';
import { useGetIntegrationStatus } from 'hooks/Integrations/useGetIntegrationStatus';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { defaultTo } from 'lodash-es';
import { ArrowLeft, MoveUpRight, RotateCw } from 'lucide-react';
import { IntegrationsProps } from 'types/api/integrations/types';

import { handleContactSupport } from '../utils';
import IntegrationDetailContent from './IntegrationDetailContent';
import IntegrationDetailHeader from './IntegrationDetailHeader';
import IntergrationsUninstallBar from './IntegrationsUninstallBar';
import { ConnectionStates } from './TestConnection';
import { getConnectionStatesFromConnectionStatus } from './utils';

import './IntegrationDetailPage.styles.scss';

interface IntegrationDetailPageProps {
	selectedIntegration: IntegrationsProps;
	setSelectedIntegration: (integration: IntegrationsProps | null) => void;
	activeDetailTab: string;
	setActiveDetailTab: React.Dispatch<React.SetStateAction<string | null>>;
}

function IntegrationDetailPage(props: IntegrationDetailPageProps): JSX.Element {
	const {
		selectedIntegration,
		setSelectedIntegration,
		activeDetailTab,
		setActiveDetailTab,
	} = props;

	const {
		data,
		isLoading,
		isFetching,
		refetch,
		isRefetching,
		isError,
	} = useGetIntegration({
		integrationId: selectedIntegration.id,
	});

	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const {
		data: integrationStatus,
		isLoading: isStatusLoading,
	} = useGetIntegrationStatus({
		integrationId: selectedIntegration.id,
	});

	const loading = isLoading || isFetching || isRefetching || isStatusLoading;
	const integrationData = data?.data.data;

	const connectionStatus = getConnectionStatesFromConnectionStatus(
		integrationData?.installation,
		defaultTo(
			integrationStatus?.data.data,
			defaultTo(integrationData?.connection_status, { logs: null, metrics: null }),
		),
	);

	return (
		<div className="integration-detail-content">
			<Flex justify="space-between" align="center">
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
			</Flex>

			{isError && (
				<div className="error-container">
					<div className="error-content">
						<img
							src="/Icons/awwSnap.svg"
							alt="error-emoji"
							className="error-state-svg"
						/>
						<Typography.Text>
							Something went wrong :/ Please retry or contact support.
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
							<div
								className="contact-support"
								onClick={(): void => handleContactSupport(isCloudUserVal)}
							>
								<Typography.Link className="text">Contact Support </Typography.Link>

								<MoveUpRight size={14} color={Color.BG_ROBIN_400} />
							</div>
						</div>
					</div>
				</div>
			)}

			{!isError && (
				<div className="integration-detail-content-container">
					<IntegrationDetailHeader
						id={selectedIntegration.id}
						title={defaultTo(integrationData?.title, '')}
						description={defaultTo(integrationData?.description, '')}
						icon={defaultTo(integrationData?.icon, '')}
						connectionState={connectionStatus}
						connectionData={defaultTo(integrationStatus?.data.data, {
							logs: null,
							metrics: null,
						})}
						onUnInstallSuccess={refetch}
						setActiveDetailTab={setActiveDetailTab}
					/>

					{!isError && !loading && integrationData && (
						<IntegrationDetailContent
							activeDetailTab={activeDetailTab}
							integrationData={integrationData}
							integrationId={selectedIntegration.id}
							setActiveDetailTab={setActiveDetailTab}
						/>
					)}

					{!isError &&
						!loading &&
						connectionStatus !== ConnectionStates.NotInstalled && (
							<IntergrationsUninstallBar
								integrationTitle={defaultTo(integrationData?.title, '')}
								integrationId={selectedIntegration.id}
								onUnInstallSuccess={refetch}
								connectionStatus={connectionStatus}
							/>
						)}
				</div>
			)}
		</div>
	);
}

export default IntegrationDetailPage;
