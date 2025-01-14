import './CloudAccountSetupModal.style.scss';

import { Color } from '@signozhq/design-tokens';
import { Form } from 'antd';
import SignozModal from 'components/SignozModal/SignozModal';
import { SquareArrowOutUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { regions } from '../../ServicesSection/data';
import {
	ComplianceNote,
	MonitoringRegionsSection,
	RegionDeploymentSection,
} from './IntegrateNowFormSections';
import { RegionSelector } from './RegionSelector';

type ActiveView = 'select-regions' | 'form';

interface CloudAccountSetupModalProps {
	isOpen: boolean;
	onClose: () => void;
}

function CloudAccountSetupModal({
	isOpen,
	onClose,
}: CloudAccountSetupModalProps): JSX.Element {
	// Form and loading state
	const [form] = Form.useForm();
	const [isLoading, setIsLoading] = useState(false);

	// View and region selection state
	const [activeView, setActiveView] = useState<ActiveView>('form');
	const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
	const [includeAllRegions, setIncludeAllRegions] = useState(false);

	// Memoized values
	const allRegions = useMemo(
		() => regions.flatMap((r) => r.subRegions.map((sr) => sr.name)),
		[],
	);

	// Helper functions
	const getRegionPreviewText = (regions: string[]): string[] =>
		regions.includes('all') ? allRegions : regions;

	const getSelectedRegionsCount = (): number =>
		selectedRegions.includes('all') ? allRegions.length : selectedRegions.length;

	// Event handlers
	const handleIncludeAllRegionsChange = (checked: boolean): void => {
		setIncludeAllRegions(checked);
		setSelectedRegions(checked ? ['all'] : []);
	};

	const handleSubmit = async (): Promise<void> => {
		try {
			setIsLoading(true);
			const values = await form.validateFields();
			console.log(values);
		} catch (error) {
			console.error('Form submission failed:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleClose = (): void => {
		setActiveView('form');
		setSelectedRegions([]);
		setIncludeAllRegions(false);
		onClose();
	};

	// Modal props based on active view
	const modalProps = {
		form: {
			title: 'Add AWS Account',
			okText: (
				<div className="cloud-account-setup-form__submit-button-content">
					Launch Cloud Formation Template{' '}
					<SquareArrowOutUpRight size={17} color={Color.BG_VANILLA_100} />
				</div>
			),
			onOk: handleSubmit,
		},
		'select-regions': {
			title: 'Which regions do you want to monitor?',
			okText: `Confirm Selection (${getSelectedRegionsCount()})`,
			onOk: (): void => setActiveView('form'),
		},
	};

	const currentView = modalProps[activeView];

	return (
		<SignozModal
			open={isOpen}
			className="cloud-account-setup-modal"
			title={currentView.title}
			onCancel={handleClose}
			onOk={currentView.onOk}
			okText={currentView.okText}
			okButtonProps={{
				loading: isLoading,
				disabled: selectedRegions.length === 0,
				className:
					activeView === 'form'
						? 'cloud-account-setup-form__submit-button'
						: 'account-setup-modal-footer__confirm-button',
				block: activeView === 'form',
			}}
			cancelButtonProps={{
				style: { display: activeView === 'form' ? 'none' : 'block' },
				className: 'account-setup-modal-footer__close-button',
			}}
		>
			{activeView === 'form' ? (
				<Form
					form={form}
					className="cloud-account-setup-form"
					layout="vertical"
					onFinish={handleSubmit}
				>
					<RegionDeploymentSection regions={regions} />
					<MonitoringRegionsSection
						includeAllRegions={includeAllRegions}
						selectedRegions={selectedRegions}
						onIncludeAllRegionsChange={handleIncludeAllRegionsChange}
						getRegionPreviewText={getRegionPreviewText}
						onRegionSelect={(): void => setActiveView('select-regions')}
					/>
					<ComplianceNote />
				</Form>
			) : (
				<RegionSelector
					selectedRegions={selectedRegions}
					setSelectedRegions={setSelectedRegions}
					setIncludeAllRegions={setIncludeAllRegions}
				/>
			)}
		</SignozModal>
	);
}

export default CloudAccountSetupModal;
