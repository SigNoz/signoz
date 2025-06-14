import { useFunnelSlowTraces } from 'hooks/TracesFunnels/useFunnels';
import { FunnelStepData } from 'types/api/traceFunnels';

import FunnelTopTracesTable from './FunnelTopTracesTable';

interface TopSlowestTracesProps {
	funnelId: string;
	stepAOrder: number;
	stepBOrder: number;
	steps: FunnelStepData[];
}

function TopSlowestTraces(props: TopSlowestTracesProps): JSX.Element {
	return (
		<FunnelTopTracesTable
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...props}
			title="Slowest 5 traces"
			tooltip="A list of the slowest traces in the funnel"
			useQueryHook={useFunnelSlowTraces}
		/>
	);
}

export default TopSlowestTraces;
