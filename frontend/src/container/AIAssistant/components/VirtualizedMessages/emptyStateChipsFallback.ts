import type { ChipDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

/** Static empty-state chips used when the contextual chips API is unavailable. */
export const EMPTY_STATE_CHIPS_FALLBACK: ChipDTO[] = [
	{
		id: 'top_errors_last_hour',
		text: 'Show me the top errors in the last hour',
	},
	{
		id: 'highest_latency_services',
		text: 'What services have the highest latency?',
	},
	{
		id: 'system_health_overview',
		text: 'Give me an overview of system health',
	},
	{
		id: 'slow_database_queries',
		text: 'Find slow database queries',
	},
	{
		id: 'endpoints_5xx_errors',
		text: 'Which endpoints have the most 5xx errors?',
	},
];
