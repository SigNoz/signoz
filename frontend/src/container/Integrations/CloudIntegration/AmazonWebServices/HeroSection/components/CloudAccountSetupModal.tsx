import { useCallback } from 'react';
import { Button } from '@signozhq/button';
import { Color } from '@signozhq/design-tokens';
import { DrawerWrapper } from '@signozhq/drawer';
import { useIntegrationModal } from 'hooks/integration/aws/useIntegrationModal';
import { SquareArrowOutUpRight } from 'lucide-react';

import {
	ActiveViewEnum,
	IntegrationModalProps,
	ModalStateEnum,
} from '../types';
import { RegionForm } from './RegionForm';

import './CloudAccountSetupModal.style.scss';

function CloudAccountSetupModal({
	onClose,
}: IntegrationModalProps): JSX.Element {
	const {
		form,
		modalState,
		isLoading,
		activeView,
		selectedRegions,
		includeAllRegions,
		isGeneratingUrl,
		setSelectedRegions,
		setIncludeAllRegions,
		handleRegionSelect,
		handleSubmit,
		handleClose,
		setActiveView,
		accountId,
		handleRegionChange,
		connectionParams,
		isConnectionParamsLoading,
		handleConnectionSuccess,
		handleConnectionTimeout,
		handleConnectionError,
	} = useIntegrationModal({ onClose });

	const renderContent = useCallback(() => {
		return (
			<div className="cloud-account-setup-modal__content">
				<RegionForm
					form={form}
					modalState={modalState}
					selectedRegions={selectedRegions}
					includeAllRegions={includeAllRegions}
					onRegionSelect={handleRegionSelect}
					onSubmit={handleSubmit}
					accountId={accountId}
					handleRegionChange={handleRegionChange}
					connectionParams={connectionParams}
					isConnectionParamsLoading={isConnectionParamsLoading}
					setSelectedRegions={setSelectedRegions}
					setIncludeAllRegions={setIncludeAllRegions}
					onConnectionSuccess={handleConnectionSuccess}
					onConnectionTimeout={handleConnectionTimeout}
					onConnectionError={handleConnectionError}
				/>

				<div className="cloud-account-setup-modal__footer">
					<Button
						variant="solid"
						color="primary"
						prefixIcon={
							<SquareArrowOutUpRight size={17} color={Color.BG_VANILLA_100} />
						}
						onClick={handleSubmit}
						disabled={
							selectedRegions.length === 0 ||
							isLoading ||
							isGeneratingUrl ||
							modalState === ModalStateEnum.WAITING
						}
					>
						Launch Cloud Formation Template
					</Button>
				</div>
			</div>
		);
	}, [
		modalState,
		form,
		selectedRegions,
		includeAllRegions,
		handleRegionSelect,
		handleSubmit,
		accountId,
		handleRegionChange,
		connectionParams,
		isConnectionParamsLoading,
		setSelectedRegions,
		setIncludeAllRegions,
		isLoading,
		isGeneratingUrl,
		handleConnectionSuccess,
		handleConnectionTimeout,
		handleConnectionError,
	]);

	const getSelectedRegionsCount = useCallback(
		(): number => selectedRegions.length,
		[selectedRegions],
	);

	const getModalConfig = useCallback(() => {
		const viewConfigs = {
			[ActiveViewEnum.FORM]: {
				title: 'Add AWS Account',
				okText: (
					<div className="cloud-account-setup-form__submit-button-content">
						Launch Cloud Formation Template{' '}
						<SquareArrowOutUpRight size={17} color={Color.BG_VANILLA_100} />
					</div>
				),
				onOk: handleSubmit,
				disabled:
					isLoading || isGeneratingUrl || modalState === ModalStateEnum.WAITING,
				cancelButtonProps: { style: { display: 'none' } },
			},
			[ActiveViewEnum.SELECT_REGIONS]: {
				title: 'Which regions do you want to monitor?',
				okText: `Confirm Selection (${getSelectedRegionsCount()})`,
				onOk: (): void => setActiveView(ActiveViewEnum.FORM),
				isLoading: isLoading || isGeneratingUrl,
				cancelButtonProps: { style: { display: 'block' } },
				disabled: false,
			},
		};

		return viewConfigs[activeView];
	}, [
		modalState,
		handleSubmit,
		getSelectedRegionsCount,
		isLoading,
		isGeneratingUrl,
		activeView,
		setActiveView,
	]);

	const modalConfig = getModalConfig();

	const handleDrawerOpenChange = (open: boolean): void => {
		if (!open) {
			handleClose();
		}
	};

	return (
		<DrawerWrapper
			open={true}
			type="panel"
			className="cloud-account-setup-modal"
			content={renderContent()}
			onOpenChange={handleDrawerOpenChange}
			direction="right"
			showCloseButton
			header={{
				title: modalConfig.title,
			}}
		/>
	);
}

export default CloudAccountSetupModal;
