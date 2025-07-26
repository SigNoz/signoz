import { createMockFunnel } from 'pages/TracesFunnels/__tests__/mockFunnelsData';
import { FunnelData } from 'types/api/traceFunnels';

export const mockSingleFunnelData: FunnelData = createMockFunnel(
	'funnel-1',
	'Checkout Process Funnel',
);
