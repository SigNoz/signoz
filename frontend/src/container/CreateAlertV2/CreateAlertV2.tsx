import './CreateAlertV2.styles.scss';

import { CreateAlertProvider } from './context';
import CreateAlertHeader from './CreateAlertHeader/CreateAlertHeader';

function CreateAlertV2(): JSX.Element {
	return (
		<div className="create-alert-v2-container">
			<CreateAlertProvider>
				<CreateAlertHeader />
			</CreateAlertProvider>
		</div>
	);
}

export default CreateAlertV2;
