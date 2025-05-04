import './InterStepConfig.styles.scss';

// COMMENTED OUT: Latency type (P99/P95/P90) UI between funnel steps
/*
import { Divider } from 'antd';
import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { FunnelStepData, LatencyOptions } from 'types/api/traceFunnels';

function InterStepConfig({
	index,
	step,
}: {
	index: number;
	step: FunnelStepData;
}): JSX.Element {
	const { handleStepChange: onStepChange } = useFunnelContext();
	const options = Object.entries(LatencyOptions).map(([key, value]) => ({
		label: key,
		value,
	}));

	return (
		<div className="inter-step-config">
			<div className="inter-step-config__label">Latency type</div>
			<div className="inter-step-config__divider">
				<Divider dashed />
			</div>
			<div className="inter-step-config__latency-options">
				<SignozRadioGroup
					value={step.latency_type}
					options={options}
					onChange={(e): void =>
						onStepChange(index, {
							...step,
							latency_type: e.target.value,
						})
					}
				/>
			</div>
		</div>
	);
}
*/

// Dummy export to avoid import errors
function InterStepConfig(): null {
	return null;
}

export default InterStepConfig;
