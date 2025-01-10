import './IntegrationModal.style.scss';

import { Button, Modal } from 'antd';
import { useIntegrationModal } from 'hooks/integrations/aws/useIntegrationModal';
import { useCallback } from 'react';

import { RegionForm } from './components/RegionForm';
import { RegionSelector } from './RegionSelector';
import { SuccessView } from './SuccessView';
import { ActiveViewEnum, IntegrationModalProps, ModalStateEnum } from './types';

function getModalTitle(
	activeView: ActiveViewEnum,
	modalState: ModalStateEnum,
): string {
	if (
		activeView === ActiveViewEnum.SELECT_REGIONS &&
		modalState === ModalStateEnum.FORM
	) {
		return 'Which regions do you want to monitor?';
	}
	if (modalState === ModalStateEnum.SUCCESS) {
		return 'AWS Webservice Integration';
	}
	return 'Add AWS Account';
}

function getModalFooter(
	activeView: ActiveViewEnum,
	selectedRegions: string[],
	allRegions: string[],
	onClose: () => void,
	onSetActiveView: () => void,
): React.ReactNode[] | null {
	if (activeView === ActiveViewEnum.SELECT_REGIONS) {
		return [
			<Button
				onClick={onClose}
				type="default"
				className="integrations-modal-footer__close-button"
				key="close-button"
			>
				Close
			</Button>,
			<Button
				onClick={onSetActiveView}
				className="integrations-modal-footer__confirm-button"
				type="primary"
				key="confirm-selection"
			>
				Confirm Selection{' '}
				<span className="integrations-modal-footer__confirm-selection-count">
					(
					{selectedRegions.includes('all')
						? allRegions.length
						: selectedRegions.length}
					)
				</span>
			</Button>,
		];
	}
	return null;
}

function IntegrationModal({
	isOpen,
	onClose,
}: IntegrationModalProps): JSX.Element {
	const {
		form,
		modalState,
		setModalState,
		isLoading,
		activeView,
		selectedRegions,
		includeAllRegions,
		isGeneratingUrl,
		setSelectedRegions,
		setIncludeAllRegions,
		handleIncludeAllRegionsChange,
		handleRegionSelect,
		handleSubmit,
		handleClose,
		setActiveView,
		allRegions,
		accountId,
		selectedDeploymentRegion,
		handleRegionChange,
	} = useIntegrationModal({ onClose });

	const renderContent = useCallback(() => {
		if (modalState === ModalStateEnum.SUCCESS) {
			return <SuccessView />;
		}

		if (activeView === ActiveViewEnum.SELECT_REGIONS) {
			return (
				<RegionSelector
					selectedRegions={selectedRegions}
					setSelectedRegions={setSelectedRegions}
					setIncludeAllRegions={setIncludeAllRegions}
				/>
			);
		}

		return (
			<RegionForm
				form={form}
				modalState={modalState}
				setModalState={setModalState}
				selectedRegions={selectedRegions}
				includeAllRegions={includeAllRegions}
				isLoading={isLoading}
				isGeneratingUrl={isGeneratingUrl}
				onIncludeAllRegionsChange={handleIncludeAllRegionsChange}
				onRegionSelect={handleRegionSelect}
				onSubmit={handleSubmit}
				accountId={accountId}
				selectedDeploymentRegion={selectedDeploymentRegion}
				handleRegionChange={handleRegionChange}
			/>
		);
	}, [
		modalState,
		activeView,
		form,
		setModalState,
		selectedRegions,
		includeAllRegions,
		isLoading,
		isGeneratingUrl,
		handleIncludeAllRegionsChange,
		handleRegionSelect,
		handleSubmit,
		accountId,
		selectedDeploymentRegion,
		handleRegionChange,
		setSelectedRegions,
		setIncludeAllRegions,
	]);

	return (
		<Modal
			title={getModalTitle(activeView, modalState)}
			centered
			open={isOpen}
			onCancel={handleClose}
			footer={getModalFooter(
				activeView,
				selectedRegions,
				allRegions,
				handleClose,
				() => setActiveView(ActiveViewEnum.FORM),
			)}
			width={672}
			rootClassName="cloud-integrations-modal"
		>
			{renderContent()}
		</Modal>
	);
}

export default IntegrationModal;
