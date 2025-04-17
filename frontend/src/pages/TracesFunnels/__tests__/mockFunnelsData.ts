import { getRandomNumber } from 'lib/getRandomColor';
import { FunnelData } from 'types/api/traceFunnels';

// Helper to create consistent mock data
export const createMockFunnel = (id: string, name: string): FunnelData => ({
	id,
	funnel_name: name,
	creation_timestamp: Date.now() - getRandomNumber(10000, 50000), // Mock timestamp
	updated_timestamp: Date.now(),
	steps: [],
	user: `user-${id}@example.com`,
	description: `Description for ${name}`,
});

export const mockFunnelsListData: FunnelData[] = [
	createMockFunnel('funnel-1', 'Checkout Process Funnel'),
	createMockFunnel('funnel-2', 'User Signup Flow'),
];

export const mockSingleFunnelData: FunnelData = createMockFunnel(
	'funnel-1',
	'Checkout Process Funnel',
);
