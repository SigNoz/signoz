import './InterStepConfig.styles.scss';

import { Divider } from 'antd';
import SignozRadioGroup from 'components/SignozRadioGroup/SignozRadioGroup';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useAppContext } from 'providers/App/App';
import { FunnelStepData, LatencyOptions } from 'types/api/traceFunnels';

function InterStepConfig({
	index,
	step,
}: {
	index: number;
	step: FunnelStepData;
}): JSX.Element {
	const { handleStepChange: onStepChange } = useFunnelContext();
	const { hasEditPermission } = useAppContext();
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
					value={step.latency_type ?? LatencyOptions.P99}
					options={options}
					disabled={!hasEditPermission}
					onChange={
						hasEditPermission
							? (e): void =>
									onStepChange(index, {
										...step,
										latency_type: e.target.value,
									})
							: (): void => {}
					}
				/>
			</div>
		</div>
	);
}

export default InterStepConfig;
