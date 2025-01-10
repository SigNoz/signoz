import './CloudAccountSetupModal.style.scss';

<<<<<<< HEAD
import { Button } from 'antd';
=======
import { Button, Form } from 'antd';
>>>>>>> 4e8aae120 (feat: integrate now modal states and json server API integration)
import SignozModal from 'components/SignozModal/SignozModal';
import { useIntegrationModal } from 'hooks/integrations/aws/useIntegrationModal';
import { useCallback } from 'react';

import {
	ActiveViewEnum,
	IntegrationModalProps,
	ModalStateEnum,
} from '../types';
import { RegionForm } from './RegionForm';
import { RegionSelector } from './RegionSelector';
import { SuccessView } from './SuccessView';

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
				className="account-setup-modal-footer__close-button"
				key="close-button"
			>
				Close
			</Button>,
			<Button
				onClick={onSetActiveView}
				className="account-setup-modal-footer__confirm-button"
				type="primary"
				key="confirm-selection"
			>
				Confirm Selection{' '}
				<span className="account-setup-modal-footer__confirm-selection-count">
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

function CloudAccountSetupModal({
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
		<SignozModal
			open={isOpen}
			className="cloud-account-setup-modal"
			title={getModalTitle(activeView, modalState)}
			onCancel={handleClose}
			footer={getModalFooter(
				activeView,
				selectedRegions,
				allRegions,
				handleClose,
				() => setActiveView(ActiveViewEnum.FORM),
			)}
			width={672}
		>
			{renderContent()}
		</SignozModal>
	);
}

export default CloudAccountSetupModal;
