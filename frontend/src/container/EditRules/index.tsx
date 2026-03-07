import { Form } from 'antd';
import EditAlertV2 from 'container/EditAlertV2';
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
	initialV2AlertValue,
}: EditRulesProps): JSX.Element {
	const [formInstance] = Form.useForm();

	if (
		initialV2AlertValue !== null &&
		initialV2AlertValue.schemaVersion === NEW_ALERT_SCHEMA_VERSION
	) {
		return (
			<EditAlertV2
				initialAlert={initialV2AlertValue}
				alertType={initialValue.alertType as AlertTypes}
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
	initialV2AlertValue: PostableAlertRuleV2 | null;
}

export default EditRules;
