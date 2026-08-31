/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	ListSpanMapperGroups200,
	SpantypesSpanMapperGroupDTO,
} from 'api/generated/services/sigNoz.schemas';

const ORG_ID = 'org-signoz';

interface GroupSeed {
	name: string;
	attributes: string[];
	enabled: boolean;
}

/**
 * A group is a condition over span attributes plus the mappings that apply once
 * it matches, which is how a non-OTel SDK's field names are brought onto the
 * `gen_ai.*` names the rest of the product reads.
 */
const GROUPS: GroupSeed[] = [
	{
		name: 'LangChain callbacks',
		attributes: ['langchain.model', 'langchain.prompt_tokens'],
		enabled: true,
	},
	{
		name: 'LlamaIndex spans',
		attributes: ['llamaindex.llm', 'llamaindex.token_count'],
		enabled: true,
	},
	{
		name: 'Vendor SDK (legacy)',
		attributes: ['ai.model_id', 'ai.usage.tokens'],
		enabled: false,
	},
];

export const MAPPING_GROUP_MAX = GROUPS.length;

const group = (
	seed: GroupSeed,
	index: number,
): SpantypesSpanMapperGroupDTO => ({
	id: `group-${index + 1}`,
	orgId: ORG_ID,
	name: seed.name,
	enabled: seed.enabled,
	condition: { attributes: seed.attributes, resource: null },
	createdAt: '2026-07-18T11:20:00Z',
	createdBy: 'anna@signoz.io',
	updatedAt: '2026-08-05T08:40:00Z',
	updatedBy: 'anna@signoz.io',
});

export const spanMapperGroupsResponse = (
	count: number,
): ListSpanMapperGroups200 => ({
	status: 'success',
	data: { items: GROUPS.slice(0, count).map(group) },
});
