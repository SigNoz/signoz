import { useCallback } from 'react';
import { Button } from '@signozhq/ui/button';
import { Drawer } from '@signozhq/ui/drawer';
import { useIntegrationModal } from 'hooks/integration/aws/useIntegrationModal';

import {
	ActiveViewEnum,
	IntegrationModalProps,
	ModalStateEnum,
} from '../../../HeroSection/types';
import CloseSetupConfirm from '../../CloseSetupConfirm/CloseSetupConfirm';
import { useCloseSetupConfirm } from '../../CloseSetupConfirm/useCloseSetupConfirm';
import { RegionForm } from '../RegionForm/RegionForm';

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
		isGeneratingCommand,
		connectionCommand,
		setSelectedRegions,
		setIncludeAllRegions,
		handleRegionSelect,
		handleSubmit,
		handleClose,
		setActiveView,
		handleRegionChange,
		connectionParams,
		isConnectionParamsLoading,
		checkConnectionAgain,
	} = useIntegrationModal({ onClose });

	const { isConfirmOpen, setIsConfirmOpen, requestClose } = useCloseSetupConfirm(
		{ shouldConfirm: Boolean(connectionCommand), onClose: handleClose },
	);

	const renderContent = useCallback(() => {
		return (
			<div className="cloud-account-setup-modal">
				<RegionForm
					form={form}
					modalState={modalState}
					selectedRegions={selectedRegions}
					includeAllRegions={includeAllRegions}
					onRegionSelect={handleRegionSelect}
					onSubmit={handleSubmit}
					connectionCommand={connectionCommand}
					handleRegionChange={handleRegionChange}
					connectionParams={connectionParams}
					isConnectionParamsLoading={isConnectionParamsLoading}
					setSelectedRegions={setSelectedRegions}
					setIncludeAllRegions={setIncludeAllRegions}
				/>
			</div>
		);
	}, [
		modalState,
		form,
		selectedRegions,
		includeAllRegions,
		handleRegionSelect,
		handleSubmit,
		connectionCommand,
		handleRegionChange,
		connectionParams,
		isConnectionParamsLoading,
		setSelectedRegions,
		setIncludeAllRegions,
	]);

	const footerActions = (
		<>
			<Button
				size="md"
				variant="outlined"
				color="secondary"
				onClick={requestClose}
				testId="aws-cancel-btn"
			>
				Cancel
			</Button>
			{!connectionCommand && (
				<Button
					disabledTooltip="Select at least one region"
					size="md"
					variant="solid"
					color="primary"
					onClick={handleSubmit}
					disabled={selectedRegions.length === 0}
					loading={isLoading || isGeneratingCommand}
					testId="aws-generate-command-btn"
				>
					Generate Command
				</Button>
			)}
			{modalState === ModalStateEnum.ERROR && connectionCommand && (
				<Button
					size="md"
					variant="solid"
					color="primary"
					onClick={checkConnectionAgain}
					testId="aws-check-connection-btn"
				>
					Check Again
				</Button>
			)}
		</>
	);

	const getSelectedRegionsCount = useCallback(
		(): number => selectedRegions.length,
		[selectedRegions],
	);

	const getModalConfig = useCallback(() => {
		const viewConfigs = {
			[ActiveViewEnum.FORM]: {
				title: 'Add AWS Account',
				okText: 'Generate Command',
				onOk: handleSubmit,
				disabled:
					isLoading || isGeneratingCommand || modalState === ModalStateEnum.WAITING,
				cancelButtonProps: { style: { display: 'none' } },
			},
			[ActiveViewEnum.SELECT_REGIONS]: {
				title: 'Which regions do you want to monitor?',
				okText: `Confirm Selection (${getSelectedRegionsCount()})`,
				onOk: (): void => setActiveView(ActiveViewEnum.FORM),
				isLoading: isLoading || isGeneratingCommand,
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
		isGeneratingCommand,
		activeView,
		setActiveView,
	]);

	const modalConfig = getModalConfig();

	return (
		<>
			<Drawer
				type="task"
				stack="overlay"
				open
				onClose={requestClose}
				title={modalConfig.title}
				width="wide"
				footerSuffix={footerActions}
			>
				{renderContent()}
			</Drawer>
			<CloseSetupConfirm
				providerName="AWS"
				testIdPrefix="aws"
				open={isConfirmOpen}
				onOpenChange={setIsConfirmOpen}
				onConfirm={handleClose}
			/>
		</>
	);
}

export default CloudAccountSetupModal;
