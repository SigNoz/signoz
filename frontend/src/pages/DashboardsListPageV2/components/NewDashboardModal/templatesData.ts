import { useQuery, type UseQueryResult } from 'react-query';

export interface DashboardTemplate {
	id: string;
	name: string;
	description: string;
	category: string;
	href: string;
	// Importable dashboard definition previewed in the gallery (mock for now).
	json: string;
}

// A representative dashboard definition for a template — mock until the API
// returns real ones.
const buildTemplateJson = (
	name: string,
	description: string,
	category: string,
): string =>
	JSON.stringify(
		{
			schemaVersion: 'v6',
			generateName: true,
			tags: [{ key: 'category', value: category.toLowerCase() }],
			spec: {
				display: { name, description },
				layouts: [],
				panels: {},
				variables: [],
			},
		},
		null,
		2,
	);

// Mock catalogue until the templates API lands. Mirrors the public gallery at
// https://signoz.io/docs/dashboards/dashboard-templates/overview/
const BASE_TEMPLATES: Omit<DashboardTemplate, 'json'>[] = [
	{
		id: 'apm',
		name: 'APM Metrics',
		description: 'Latency, error rate, and throughput across your services.',
		category: 'APM',
		href: 'https://signoz.io/docs/dashboards/dashboard-templates/apm/',
	},
	{
		id: 'hostmetrics',
		name: 'Host Metrics',
		description: 'CPU, memory, disk, and network for your hosts.',
		category: 'Infra',
		href: 'https://signoz.io/docs/dashboards/dashboard-templates/hostmetrics/',
	},
	{
		id: 'kubernetes',
		name: 'Kubernetes Pod Metrics',
		description: 'Pod, node, and container health for your clusters.',
		category: 'Infra',
		href:
			'https://signoz.io/docs/dashboards/dashboard-templates/kubernetes-pod-metrics-detailed/',
	},
	{
		id: 'postgres',
		name: 'PostgreSQL',
		description: 'Connections, throughput, and query performance.',
		category: 'Databases',
		href: 'https://signoz.io/docs/dashboards/dashboard-templates/postgresql/',
	},
	{
		id: 'redis',
		name: 'Redis',
		description: 'Memory, commands, and hit-rate for Redis instances.',
		category: 'Databases',
		href: 'https://signoz.io/docs/dashboards/dashboard-templates/redis/',
	},
	{
		id: 'nginx',
		name: 'NGINX',
		description: 'Request rate, connections, and error responses.',
		category: 'Web servers',
		href: 'https://signoz.io/docs/dashboards/dashboard-templates/nginx/',
	},
];

const MOCK_TEMPLATES: DashboardTemplate[] = BASE_TEMPLATES.map((t) => ({
	...t,
	json: buildTemplateJson(t.name, t.description, t.category),
}));

// TODO(@AshwinBhatkal): replace with the real templates API when available.
// The small delay simulates the network round-trip so the loading state is
// exercised (a real API call won't resolve instantly).
const fetchDashboardTemplates = (): Promise<DashboardTemplate[]> =>
	new Promise((resolve) => {
		setTimeout(() => resolve(MOCK_TEMPLATES), 600);
	});

export function useDashboardTemplates(
	enabled: boolean,
): UseQueryResult<DashboardTemplate[]> {
	return useQuery({
		queryKey: ['dashboard-templates'],
		queryFn: fetchDashboardTemplates,
		enabled,
		staleTime: Infinity,
	});
}
