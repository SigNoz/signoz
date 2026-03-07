import AlertRuleProvider from 'providers/Alert';

import AlertDetails from './AlertDetails';

function AlertDetailsPage(): JSX.Element {
	return (
		<AlertRuleProvider>
			<AlertDetails />
		</AlertRuleProvider>
	);
}

export default AlertDetailsPage;
