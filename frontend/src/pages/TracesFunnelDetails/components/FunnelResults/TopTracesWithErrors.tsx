import { useFunnelErrorTraces } from 'hooks/TracesFunnels/useFunnels';
import { FunnelStepData } from 'types/api/traceFunnels';

import FunnelTopTracesTable from './FunnelTopTracesTable';

interface TopTracesWithErrorsProps {
	funnelId: string;
	stepAOrder: number;
	stepBOrder: number;
	steps: FunnelStepData[];
}

function TopTracesWithErrors(props: TopTracesWithErrorsProps): JSX.Element {
	return (
		<FunnelTopTracesTable
			{...props}
			title="Traces with errors"
			testId="funnel-error-traces"
			tooltip="A list of the traces with errors in the funnel"
			useQueryHook={useFunnelErrorTraces}
		/>
	);
}

export default TopTracesWithErrors;
