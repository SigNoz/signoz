import './CloudAccountSetupModal.style.scss';

import { Color } from '@signozhq/design-tokens';
import SignozModal from 'components/SignozModal/SignozModal';
import ROUTES from 'constants/routes';
import { useIntegrationModal } from 'hooks/integrations/aws/useIntegrationModal';
import { SquareArrowOutUpRight } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom-v5-compat';

import {
	ActiveViewEnum,
	IntegrationModalProps,
	ModalStateEnum,
} from '../types';
import { RegionForm } from './RegionForm';
import { RegionSelector } from './RegionSelector';
import { SuccessView } from './SuccessView';

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
		handleIncludeAllRegionsChange,
		handleRegionSelect,
		handleSubmit,
		accountId,
		selectedDeploymentRegion,
		handleRegionChange,
		setSelectedRegions,
		setIncludeAllRegions,
	]);

	const getSelectedRegionsCount = useCallback(
		(): number =>
			selectedRegions.includes('all') ? allRegions.length : selectedRegions.length,
		[selectedRegions, allRegions],
	);

	const navigate = useNavigate();
	const handleGoToDashboards = useCallback((): void => {
		navigate(ROUTES.ALL_DASHBOARD);
	}, [navigate]);

	const getModalConfig = useCallback(() => {
		// Handle success state first
		if (modalState === ModalStateEnum.SUCCESS) {
			return {
				title: 'AWS Webservice Integration',
				okText: (
					<div className="cloud-account-setup-success-view__footer-button">
						Go to Dashboards
					</div>
				),
				block: true,
				onOk: handleGoToDashboards,
				cancelButtonProps: { style: { display: 'none' } },
				disabled: false,
			};
		}

		// Handle other views
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
		handleGoToDashboards,
		setActiveView,
	]);

	const modalConfig = getModalConfig();

	return (
		<SignozModal
			open={isOpen}
			className="cloud-account-setup-modal"
			title={modalConfig.title}
			onCancel={handleClose}
			onOk={modalConfig.onOk}
			okText={modalConfig.okText}
			okButtonProps={{
				loading: isLoading,
				disabled: selectedRegions.length === 0 || modalConfig.disabled,
				className:
					activeView === ActiveViewEnum.FORM
						? 'cloud-account-setup-form__submit-button'
						: 'account-setup-modal-footer__confirm-button',
				block: activeView === ActiveViewEnum.FORM,
			}}
			cancelButtonProps={modalConfig.cancelButtonProps}
			width={672}
		>
			{renderContent()}
		</SignozModal>
	);
}

export default CloudAccountSetupModal;
