import { useFunnelErrorTraces } from 'hooks/TracesFunnels/useFunnels';

import FunnelTopTracesTable from './FunnelTopTracesTable';

interface TopTracesWithErrorsProps {
	funnelId: string;
	stepAOrder: number;
	stepBOrder: number;
}

function TopTracesWithErrors(props: TopTracesWithErrorsProps): JSX.Element {
	return (
		<FunnelTopTracesTable
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...props}
			title="Traces with errors"
			tooltip="A list of the traces with errors in the funnel"
			useQueryHook={useFunnelErrorTraces}
		/>
	);
}

export default TopTracesWithErrors;
