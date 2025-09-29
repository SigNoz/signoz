import { Form } from 'antd';
import CreateAlertV2 from 'container/CreateAlertV2';
import FormAlertRules from 'container/FormAlertRules';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { NEW_ALERT_SCHEMA_VERSION } from 'types/api/alerts/alertTypesV2';
import { AlertDef } from 'types/api/alerts/def';

function EditRules({ initialValue, ruleId }: EditRulesProps): JSX.Element {
	const [formInstance] = Form.useForm();

	// If the schema version is v2alpha1, then we need to show the CreateAlertV2 component
	if (initialValue.schemaVersion === NEW_ALERT_SCHEMA_VERSION) {
		return (
			<CreateAlertV2
				alertType={initialValue.alertType as AlertTypes}
				ruleId={ruleId}
				initialAlertDef={initialValue}
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
}

export default EditRules;
