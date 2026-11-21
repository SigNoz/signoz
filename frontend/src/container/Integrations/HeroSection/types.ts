import type { Dispatch, SetStateAction } from 'react';
import type { FormInstance } from 'antd';
import type { CloudintegrationtypesCredentialsDTO } from 'api/generated/services/sigNoz.schemas/cloudintegrationtypesCredentialsDTO';

export enum ActiveViewEnum {
	SELECT_REGIONS = 'select-regions',
	FORM = 'form',
}

export enum ModalStateEnum {
	FORM = 'form',
	WAITING = 'waiting',
	ERROR = 'error',
}

export interface RegionFormProps {
	form: FormInstance;
	modalState: ModalStateEnum;
	selectedRegions: string[];
	includeAllRegions: boolean;
	onRegionSelect: () => void;
	onSubmit: () => Promise<void>;
	connectionCommand: string | null;
	handleRegionChange: (value: string) => void;
	connectionParams?: CloudintegrationtypesCredentialsDTO;
	isConnectionParamsLoading?: boolean;
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
}

export interface IntegrationModalProps {
	onClose: () => void;
}
