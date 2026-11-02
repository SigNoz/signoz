import { QueryBuilderField } from '../../queryBuilderFields.types';
import { STEP_INTERVAL_PLACEHOLDER } from '../../queryBuilderFields.utils';
import { ADD_ON_DEFINITIONS } from '../QueryAddOns/constants';

export const BUILT_IN_PLACEHOLDERS = {
	[QueryBuilderField.StepInterval]: STEP_INTERVAL_PLACEHOLDER,
	[QueryBuilderField.GroupBy]:
		ADD_ON_DEFINITIONS[QueryBuilderField.GroupBy].placeholder,
} as const;
