/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	ApiRoutingPolicy,
	GetRoutingPoliciesResponse,
} from 'api/routingPolicies/getRoutingPolicies';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const ago = (ms: number): string => new Date(Date.now() - ms).toISOString();

interface PolicySeed {
	name: string;
	description: string;
	expression: string;
	/** Indexes into the channel seeds the shared alert builders publish. */
	channels: number[];
}

const SEEDS: PolicySeed[] = [
	{
		name: 'Critical production to on-call',
		description: 'Anything critical in prod pages whoever is on call.',
		expression: 'severity = "critical" AND env = "prod"',
		channels: [1, 0],
	},
	{
		name: 'Payments team ownership',
		description: 'Payment alerts go to the team that owns the service.',
		expression: 'team = "payments"',
		channels: [0],
	},
	{
		name: 'Platform warnings to chat',
		description: 'Warnings from the platform team stay in chat.',
		expression: 'team = "platform" AND severity = "warning"',
		channels: [5],
	},
	{
		name: 'Staging is email only',
		description: 'Nothing from staging is allowed to page.',
		expression: 'env = "staging"',
		channels: [3],
	},
	{
		name: 'Database incidents',
		description: 'Anything touching Postgres opens an incident.',
		expression: 'component = "database"',
		channels: [4, 2],
	},
	{
		name: 'Catch-all',
		description: 'Everything not matched above lands in the ops channel.',
		expression: 'severity != ""',
		channels: [0],
	},
];

export const ROUTING_POLICY_MAX = SEEDS.length;

export const FIRST_POLICY_NAME = SEEDS[0].name;

const buildPolicy = (
	index: number,
	channelNames: string[],
): ApiRoutingPolicy => {
	const seed = SEEDS[index % SEEDS.length];

	return {
		id: `routing-policy-${index + 1}`,
		name: seed.name,
		description: seed.description,
		expression: seed.expression,
		channels: seed.channels
			.map((channelIndex) => channelNames[channelIndex])
			.filter(Boolean),
		createdAt: ago((index + 6) * DAY),
		updatedAt: ago((index + 1) * HOUR),
		createdBy: 'ada@signoz.io',
		updatedBy: 'grace@signoz.io',
	};
};

export const routingPoliciesResponse = (
	count: number,
	channelNames: string[],
): GetRoutingPoliciesResponse => ({
	status: 'success',
	data: Array.from({ length: count }, (_unused, index) =>
		buildPolicy(index, channelNames),
	),
});
