import { Form } from 'antd';
import CreateAlertV2 from 'container/CreateAlertV2';
import FormAlertRules from 'container/FormAlertRules';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import {
	NEW_ALERT_SCHEMA_VERSION,
	PostableAlertRuleV2,
} from 'types/api/alerts/alertTypesV2';
import { AlertDef } from 'types/api/alerts/def';

function EditRules({
	initialValue,
	ruleId,
	initalV2AlertValue,
}: EditRulesProps): JSX.Element {
	const [formInstance] = Form.useForm();

	if (
		initalV2AlertValue !== null &&
		initalV2AlertValue.schemaVersion === NEW_ALERT_SCHEMA_VERSION
	) {
		return (
			<CreateAlertV2
				alertType={initialValue.alertType as AlertTypes}
				ruleId={ruleId}
				initialAlert={initalV2AlertValue}
				isEditMode
			/>
		);
	}

	return (
		<FormAlertRules
			alertType={
				initialValue.alertType
					? (initialValue.alertType as AlertTypes)
					: AlertTypes.METRICS_BASED_ALERT
			}
			formInstance={formInstance}
			initialValue={initialValue}
			ruleId={ruleId}
		/>
	);
}

interface EditRulesProps {
	initialValue: AlertDef;
	ruleId: string;
	initalV2AlertValue: PostableAlertRuleV2 | null;
}

export default EditRules;
