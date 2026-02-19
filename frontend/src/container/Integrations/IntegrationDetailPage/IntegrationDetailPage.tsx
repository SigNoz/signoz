import { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Button } from '@signozhq/button';
import { Color } from '@signozhq/design-tokens';
import { Flex, Skeleton, Typography } from 'antd';
import ROUTES from 'constants/routes';
import { useGetIntegration } from 'hooks/Integrations/useGetIntegration';
import { useGetIntegrationStatus } from 'hooks/Integrations/useGetIntegrationStatus';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { defaultTo } from 'lodash-es';
import { ArrowLeft, MoveUpRight, RotateCw } from 'lucide-react';

import CloudIntegration from '../CloudIntegration/CloudIntegration';
import { INTEGRATION_TYPES } from '../constants';
import { IntegrationType } from '../types';
import { handleContactSupport } from '../utils';
import IntegrationDetailContent from './IntegrationDetailContent';
import IntegrationDetailHeader from './IntegrationDetailHeader';
import IntergrationsUninstallBar from './IntegrationsUninstallBar';
import { ConnectionStates } from './TestConnection';
import { getConnectionStatesFromConnectionStatus } from './utils';

import './IntegrationDetailPage.styles.scss';

// eslint-disable-next-line sonarjs/cognitive-complexity
function IntegrationDetailPage(): JSX.Element {
	const history = useHistory();
	const { integrationId } = useParams<{ integrationId?: string }>();
	const [activeDetailTab, setActiveDetailTab] = useState<string | null>(
		'overview',
	);

	const {
		data,
		isLoading,
		isFetching,
		refetch,
		isRefetching,
		isError,
	} = useGetIntegration({
		integrationId: integrationId || '',
	});

	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const {
		data: integrationStatus,
		isLoading: isStatusLoading,
	} = useGetIntegrationStatus({
		integrationId: integrationId || '',
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

	if (
		integrationId === INTEGRATION_TYPES.AWS ||
		integrationId === INTEGRATION_TYPES.AZURE
	) {
		return (
			<CloudIntegration
				type={
					integrationId === INTEGRATION_TYPES.AWS
						? IntegrationType.AWS_SERVICES
						: IntegrationType.AZURE_SERVICES
				}
			/>
		);
	}

	return (
		<div className="integration-details-container">
			<Flex justify="space-between" align="center">
				<Button
					variant="link"
					color="secondary"
					prefixIcon={<ArrowLeft size={14} />}
					className="all-integrations-btn"
					onClick={(): void => {
						history.push(ROUTES.INTEGRATIONS);
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
								variant="solid"
								color="primary"
								onClick={(): Promise<any> => refetch()}
								prefixIcon={<RotateCw size={14} />}
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
				<div className="integration-details-content-container">
					<IntegrationDetailHeader
						id={integrationId || ''}
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
						isLoading={loading}
					/>

					{loading && (
						<div className="loading-container">
							<Skeleton active className="skeleton-item" />
						</div>
					)}

					{!isError && !loading && integrationData && (
						<IntegrationDetailContent
							activeDetailTab={activeDetailTab || 'overview'}
							integrationData={integrationData}
							integrationId={integrationId || ''}
							setActiveDetailTab={setActiveDetailTab}
						/>
					)}

					{!isError &&
						!loading &&
						connectionStatus !== ConnectionStates.NotInstalled && (
							<IntergrationsUninstallBar
								integrationTitle={defaultTo(integrationData?.title, '')}
								integrationId={integrationId || ''}
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
