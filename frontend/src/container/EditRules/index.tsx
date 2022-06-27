import FormAlertRules from 'container/FormAlertRules';
import React from 'react';
import { AlertDef } from 'types/api/alerts/def.ts';

function EditRules({ initialValue, ruleId }: EditRulesProps): JSX.Element {
	return (
		<FormAlertRules
			formInstance={null}
			initialValue={initialValue}
			ruleId={ruleId}
		/>
	);
}

interface EditRulesProps {
	initialValue: AlertDef;
	ruleId: string;
}

export default EditRules;
