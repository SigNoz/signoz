import './styles.scss';

import { Labels } from 'types/api/alerts/def';

import { useCreateAlertState } from '../context';
import LabelsInput from './LabelsInput';

function CreateAlertHeader(): JSX.Element {
	const { alertState, setAlertState } = useCreateAlertState();

	return (
		<div className="alert-header">
			<div className="alert-header__tab-bar">
				<div className="alert-header__tab">New Alert Rule</div>
			</div>

			<div className="alert-header__content">
				<input
					type="text"
					value={alertState.name}
					onChange={(e): void =>
						setAlertState({ type: 'SET_ALERT_NAME', payload: e.target.value })
					}
					className="alert-header__input title"
					placeholder="Enter alert rule name"
				/>
				<input
					type="text"
					value={alertState.description}
					onChange={(e): void =>
						setAlertState({ type: 'SET_ALERT_DESCRIPTION', payload: e.target.value })
					}
					className="alert-header__input description"
					placeholder="Click to add description..."
				/>
				<LabelsInput
					labels={alertState.labels}
					onLabelsChange={(labels: Labels): void =>
						setAlertState({ type: 'SET_ALERT_LABELS', payload: labels })
					}
				/>
			</div>
		</div>
	);
}

export default CreateAlertHeader;
