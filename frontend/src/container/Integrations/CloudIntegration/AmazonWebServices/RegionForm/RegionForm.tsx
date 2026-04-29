import { useRef } from 'react';
import { Form } from 'antd';
import { useGetAccount } from 'api/generated/services/cloudintegration';
import cx from 'classnames';
import { INTEGRATION_TYPES } from 'container/Integrations/constants';
import {
	ModalStateEnum,
	RegionFormProps,
} from 'container/Integrations/HeroSection/types';
import { regions } from 'utils/regions';

import AlertMessage from '../../AlertMessage';
import {
	ComplianceNote,
	MonitoringRegionsSection,
	RegionDeploymentSection,
} from '../IntegrateNowFormSections';
import RenderConnectionFields from './RenderConnectionParams';

export function RegionForm({
	form,
	modalState,
	selectedRegions,
	onSubmit,
	accountId,
	handleRegionChange,
	connectionParams,
	isConnectionParamsLoading,
	setSelectedRegions,
	setIncludeAllRegions,
	onConnectionSuccess,
	onConnectionTimeout,
	onConnectionError,
}: RegionFormProps): JSX.Element {
	const startTimeRef = useRef(Date.now());
	const refetchInterval = 10 * 1000;
	const errorTimeout = 10 * 60 * 1000;

	const { isLoading: isAccountStatusLoading } = useGetAccount(
		{
			cloudProvider: INTEGRATION_TYPES.AWS,
			id: accountId ?? '',
		},
		{
			query: {
				refetchInterval,
				enabled: !!accountId && modalState === ModalStateEnum.WAITING,
				onSuccess: (response) => {
					const isConnected =
						Boolean(response.data.providerAccountId) &&
						response.data.removedAt === null;

					if (isConnected) {
						const cloudAccountId =
							response.data.providerAccountId ?? response.data.id;

						onConnectionSuccess({
							cloudAccountId,
							status: response.data.agentReport,
						});
					} else if (Date.now() - startTimeRef.current >= errorTimeout) {
						onConnectionTimeout({ id: accountId });
					}
				},
				onError: () => {
					onConnectionError();
				},
			},
		},
	);

	const isFormDisabled =
		modalState === ModalStateEnum.WAITING || isAccountStatusLoading;

	return (
		<Form
			form={form}
			className="cloud-account-setup-form"
			layout="vertical"
			onFinish={onSubmit}
		>
			<div
				className={cx(`cloud-account-setup-form__content`, {
					disabled: isFormDisabled,
				})}
			>
				<RegionDeploymentSection
					regions={regions}
					handleRegionChange={handleRegionChange}
					isFormDisabled={isFormDisabled}
				/>
				<MonitoringRegionsSection
					selectedRegions={selectedRegions}
					setSelectedRegions={setSelectedRegions}
					setIncludeAllRegions={setIncludeAllRegions}
				/>
				<ComplianceNote />
				<RenderConnectionFields
					isConnectionParamsLoading={isConnectionParamsLoading}
					connectionParams={connectionParams}
					isFormDisabled={isFormDisabled}
				/>
			</div>

			<div className="cloud-account-setup-form__alert">
				<AlertMessage modalState={modalState} />
			</div>
		</Form>
	);
}
