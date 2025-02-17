import { Form } from 'antd';
import cx from 'classnames';
import { useAccountStatus } from 'hooks/integration/aws/useAccountStatus';
import { useRef } from 'react';
import { AccountStatusResponse } from 'types/api/integrations/aws';
import { regions } from 'utils/regions';

import { ModalStateEnum, RegionFormProps } from '../types';
import AlertMessage from './AlertMessage';
import {
	ComplianceNote,
	MonitoringRegionsSection,
	RegionDeploymentSection,
} from './IntegrateNowFormSections';
import RenderConnectionFields from './RenderConnectionParams';

const allRegions = (): string[] =>
	regions.flatMap((r) => r.subRegions.map((sr) => sr.name));

const getRegionPreviewText = (regions: string[]): string[] => {
	if (regions.includes('all')) {
		return allRegions();
	}
	return regions;
};

export function RegionForm({
	form,
	modalState,
	setModalState,
	selectedRegions,
	includeAllRegions,
	onIncludeAllRegionsChange,
	onRegionSelect,
	onSubmit,
	accountId,
	selectedDeploymentRegion,
	handleRegionChange,
	connectionParams,
	isConnectionParamsLoading,
}: RegionFormProps): JSX.Element {
	const startTimeRef = useRef(Date.now());
	const refetchInterval = 10 * 1000;
	const errorTimeout = 5 * 60 * 1000;

	const { isLoading: isAccountStatusLoading } = useAccountStatus(accountId, {
		refetchInterval,
		enabled: !!accountId && modalState === ModalStateEnum.WAITING,
		onSuccess: (data: AccountStatusResponse) => {
			if (data.data.status.integration.last_heartbeat_ts_ms !== null) {
				setModalState(ModalStateEnum.SUCCESS);
			} else if (Date.now() - startTimeRef.current >= errorTimeout) {
				// 5 minutes in milliseconds
				setModalState(ModalStateEnum.ERROR);
			}
		},
		onError: () => {
			setModalState(ModalStateEnum.ERROR);
		},
	});

	const isFormDisabled =
		modalState === ModalStateEnum.WAITING || isAccountStatusLoading;

	return (
		<Form
			form={form}
			className="cloud-account-setup-form"
			layout="vertical"
			onFinish={onSubmit}
		>
			<AlertMessage modalState={modalState} />

			<div
				className={cx(`cloud-account-setup-form__content`, {
					disabled: isFormDisabled,
				})}
			>
				<RegionDeploymentSection
					regions={regions}
					handleRegionChange={handleRegionChange}
					isFormDisabled={isFormDisabled}
					selectedDeploymentRegion={selectedDeploymentRegion}
				/>
				<MonitoringRegionsSection
					includeAllRegions={includeAllRegions}
					selectedRegions={selectedRegions}
					onIncludeAllRegionsChange={onIncludeAllRegionsChange}
					getRegionPreviewText={getRegionPreviewText}
					onRegionSelect={onRegionSelect}
					isFormDisabled={isFormDisabled}
				/>
				<ComplianceNote />
				<RenderConnectionFields
					isConnectionParamsLoading={isConnectionParamsLoading}
					connectionParams={connectionParams}
					isFormDisabled={isFormDisabled}
				/>
			</div>
		</Form>
	);
}
