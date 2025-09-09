import CreateAlertRule from 'container/CreateAlertRule';
import CreateAlertV2 from 'container/CreateAlertV2';
import { showNewCreateAlertsPage } from 'container/CreateAlertV2/utils';

function CreateAlertPage(): JSX.Element {
	const showNewCreateAlertsPageFlag = showNewCreateAlertsPage();

	if (showNewCreateAlertsPageFlag) {
		return <CreateAlertV2 />;
	}

	return <CreateAlertRule />;
}

export default CreateAlertPage;
