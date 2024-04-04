import { Form } from 'antd';
import FormAlertRules from 'container/FormAlertRules';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';

function EditRules({ initialValue, ruleId }: EditRulesProps): JSX.Element {
	const [formInstance] = Form.useForm();

	return (
		<div style={{ marginTop: '1rem' }}>
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
		</div>
	);
}

interface EditRulesProps {
	initialValue: AlertDef;
	ruleId: number;
}

export default EditRules;
