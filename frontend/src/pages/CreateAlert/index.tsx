import CreateAlertRule from 'container/CreateAlertRule';
import React from 'react';
import { alertDefaults } from 'types/api/alerts/create';

function CreateAlertPage(): JSX.Element {
	return <CreateAlertRule initialValue={alertDefaults} />;
}

export default CreateAlertPage;
