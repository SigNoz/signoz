import { Dispatch, SetStateAction } from 'react';
import { FormInstance } from 'antd';
import { ConnectionParams } from 'types/api/integrations/types';

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
	onRegionSelect: () => void;
	onSubmit: () => Promise<void>;
	accountId?: string;
	handleRegionChange: (value: string) => void;
	connectionParams?: ConnectionParams;
	isConnectionParamsLoading?: boolean;
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
}

export interface IntegrationModalProps {
	onClose: () => void;
}
