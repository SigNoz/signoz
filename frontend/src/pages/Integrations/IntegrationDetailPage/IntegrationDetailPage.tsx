/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable no-nested-ternary */
import './IntegrationDetailPage.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Flex, Skeleton, Typography } from 'antd';
import { useGetIntegration } from 'hooks/Integrations/useGetIntegration';
import { useGetIntegrationStatus } from 'hooks/Integrations/useGetIntegrationStatus';
import { defaultTo } from 'lodash-es';
import { ArrowLeft, MoveUpRight, RotateCw } from 'lucide-react';
import { isCloudUser } from 'utils/app';

import { handleContactSupport } from '../utils';
import IntegrationDetailContent from './IntegrationDetailContent';
import IntegrationDetailHeader from './IntegrationDetailHeader';
import IntergrationsUninstallBar from './IntegrationsUninstallBar';
import { ConnectionStates } from './TestConnection';
import { getConnectionStatesFromConnectionStatus } from './utils';

interface IntegrationDetailPageProps {
	selectedIntegration: string;
	setSelectedIntegration: (id: string | null) => void;
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
		integrationId: selectedIntegration,
	});

	const {
		data: integrationStatus,
		isLoading: isStatusLoading,
	} = useGetIntegrationStatus({
		integrationId: selectedIntegration,
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

			{loading ? (
				<div className="loading-integration-details">
					<Skeleton.Input active size="large" className="skeleton-1" />
					<Skeleton.Input active size="large" className="skeleton-2" />
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
								onClick={(): void => handleContactSupport(isCloudUser())}
							>
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
							connectionData={defaultTo(integrationStatus?.data.data, {
								logs: null,
								metrics: null,
							})}
							onUnInstallSuccess={refetch}
							setActiveDetailTab={setActiveDetailTab}
						/>
						<IntegrationDetailContent
							activeDetailTab={activeDetailTab}
							integrationData={integrationData}
							integrationId={selectedIntegration}
							setActiveDetailTab={setActiveDetailTab}
						/>

						{connectionStatus !== ConnectionStates.NotInstalled && (
							<IntergrationsUninstallBar
								integrationTitle={defaultTo(integrationData?.title, '')}
								integrationId={selectedIntegration}
								onUnInstallSuccess={refetch}
								connectionStatus={connectionStatus}
							/>
						)}
					</>
				)
			)}
		</div>
	);
}

export default IntegrationDetailPage;
