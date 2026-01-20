import { FormInstance } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { ConnectionParams } from 'types/api/integrations/aws';

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
	onIncludeAllRegionsChange: (checked: boolean) => void;
	onRegionSelect: () => void;
	onSubmit: () => Promise<void>;
	accountId?: string;
	selectedDeploymentRegion: string | undefined;
	handleRegionChange: (value: string) => void;
	connectionParams?: ConnectionParams;
	isConnectionParamsLoading?: boolean;
}

export interface IntegrationModalProps {
	onClose: () => void;
}
