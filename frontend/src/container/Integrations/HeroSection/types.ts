import { Dispatch, SetStateAction } from 'react';
import { FormInstance } from 'antd';
import { CloudintegrationtypesCredentialsDTO } from 'api/generated/services/sigNoz.schemas';

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
	accountId?: string;
	handleRegionChange: (value: string) => void;
	connectionParams?: CloudintegrationtypesCredentialsDTO;
	isConnectionParamsLoading?: boolean;
	setSelectedRegions: Dispatch<SetStateAction<string[]>>;
	setIncludeAllRegions: Dispatch<SetStateAction<boolean>>;
	onConnectionSuccess: (payload: {
		cloudAccountId: string;
		status?: unknown;
	}) => void;
	onConnectionTimeout: (payload: { id?: string }) => void;
	onConnectionError: () => void;
}

export interface IntegrationModalProps {
	onClose: () => void;
}
