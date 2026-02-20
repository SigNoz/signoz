import { Dispatch, SetStateAction } from 'react';
import { ValidateFunnelResponse } from 'api/traceFunnels';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { FunnelStepData } from 'types/api/traceFunnels';

export interface FunnelContextType {
	startTime: number;
	endTime: number;
	selectedTime: CustomTimeType | Time;
	validTracesCount: number;
	funnelId: string;
	steps: FunnelStepData[];
	setSteps: Dispatch<SetStateAction<FunnelStepData[]>>;
	initialSteps: FunnelStepData[];
	handleAddStep: () => boolean;
	handleStepChange: (index: number, newStep: Partial<FunnelStepData>) => void;
	handleStepRemoval: (index: number) => void;
	handleRunFunnel: () => void;
	handleSaveFunnel: () => void;
	triggerSave: boolean;
	hasUnsavedChanges: boolean;
	validationResponse:
		| SuccessResponse<ValidateFunnelResponse>
		| ErrorResponse
		| undefined;
	isValidateStepsLoading: boolean;
	hasIncompleteStepFields: boolean;
	hasAllEmptyStepFields: boolean;
	handleReplaceStep: (
		index: number,
		serviceName: string,
		spanName: string,
	) => void;
	handleRestoreSteps: (oldSteps: FunnelStepData[]) => void;
	isUpdatingFunnel: boolean;
	setIsUpdatingFunnel: Dispatch<SetStateAction<boolean>>;
	lastUpdatedSteps: FunnelStepData[];
	setLastUpdatedSteps: Dispatch<SetStateAction<FunnelStepData[]>>;
}
