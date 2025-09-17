import CreateAlertRule from 'container/CreateAlertRule';
import { showNewCreateAlertsPage } from 'container/CreateAlertV2/utils';
import { lazy } from 'react';

const CreateAlertV2 = lazy(() => import('container/CreateAlertV2'));

function CreateAlertPage(): JSX.Element {
	const showNewCreateAlertsPageFlag = showNewCreateAlertsPage();

	if (showNewCreateAlertsPageFlag) {
		return <CreateAlertV2 />;
	}

	return <CreateAlertRule />;
}

export default CreateAlertPage;
