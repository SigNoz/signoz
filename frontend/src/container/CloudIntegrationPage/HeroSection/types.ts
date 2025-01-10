import { FormInstance } from 'antd';
import { Dispatch, SetStateAction } from 'react';

export enum ActiveViewEnum {
	SELECT_REGIONS = 'select-regions',
	FORM = 'form',
}

export enum ModalStateEnum {
	FORM = 'form',
	WAITING = 'waiting',
	ERROR = 'error',
	SUCCESS = 'success',
}

export interface RegionFormProps {
	form: FormInstance;
	modalState: ModalStateEnum;
	setModalState: Dispatch<SetStateAction<ModalStateEnum>>;
	selectedRegions: string[];
	includeAllRegions: boolean;
	isLoading: boolean;
	isGeneratingUrl: boolean;
	onIncludeAllRegionsChange: (checked: boolean) => void;
	onRegionSelect: () => void;
	onSubmit: () => Promise<void>;
	accountId?: string;
	selectedDeploymentRegion: string | undefined;
	handleRegionChange: (value: string) => void;
}

export interface IntegrationModalProps {
	isOpen: boolean;
	onClose: () => void;
}
