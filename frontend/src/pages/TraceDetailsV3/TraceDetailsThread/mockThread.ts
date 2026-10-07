// Placeholder until GET /api/v1/traces/{id}/thread is available. Wire format: spans carry time_unix.

const TRACE_ID = '7a1f0c2d9e8b4a6f5c3d2e1f0a9b8c7d';

const IMAGE_DATA_URL =
	'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAEAAQADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL';

const OBSERVABILITY_PROMPT =
	"You are an observability assistant. Observability is understanding a system's internal state from the telemetry it emits: traces, metrics, and logs. For LLM and agent workloads these signals also carry the model used, input and output token counts, the cost those tokens imply, the tools an agent invoked, and whether each call succeeded or failed. Always answer concisely. ".repeat(
		18,
	);

const SPAN_DEFAULTS = {
	events: [],
	flags: 0,
	has_children: false,
	has_error: false,
	is_remote: '',
	level: 1,
	parent_span_id: '0000000000000r00',
	references: [],
	resource: { 'service.name': 'travel-agent' },
	sub_tree_node_count: 0,
	trace_id: TRACE_ID,
	trace_state: '',
};

export const MOCK_TRACE_THREAD_SPANS = [
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'[{"role":"system","content":"You are a research assistant. Use the search-web and get-weather tools as needed."},{"role":"user","content":[{"type":"text","text":"Search for SigNoz AI observability docs, then tell me the weather in Bengaluru."}]},{"role":"assistant","content":[{"type":"tool-call","toolCallId":"call_opFrOeFM5pF9PnXe6lWcl0ui","toolName":"searchWeb","args":{"query":"SigNoz AI observability documentation"}},{"type":"tool-call","toolCallId":"call_HxRE0JdcM3F32SCbIu3SGk3G","toolName":"getWeather","args":{"city":"Bengaluru"}}]},{"role":"tool","content":[{"type":"tool-result","toolCallId":"call_opFrOeFM5pF9PnXe6lWcl0ui","toolName":"searchWeb","result":{"query":"SigNoz AI observability documentation","results":[{"title":"SigNoz docs","snippet":"AI observability ..."},{"title":"OTel GenAI","snippet":"semantic conventions ..."}]}},{"type":"tool-result","toolCallId":"call_HxRE0JdcM3F32SCbIu3SGk3G","toolName":"getWeather","result":{"city":"Bengaluru","temperatureC":18,"summary":"Clear"}}]}]',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'I found some information on SigNoz AI observability documentation. Here are a couple of relevant links:\n\n1. **SigNoz docs** - This includes details about AI observability.\n2. **OTel GenAI** - This document discusses semantic conventions related to observability.\n\nAs for the weather in Bengaluru, it is currently clear with a temperature of 18°C.',
			'gen_ai.provider.name': 'openai.chat',
			'gen_ai.request.model': 'gpt-4o-mini',
			'gen_ai.usage.input_tokens': 243,
			'gen_ai.usage.output_tokens': 77,
			'signoz.gen_ai.usage.input_tokens.cost': 0.0006075000000000001,
			'signoz.gn_ai.usage.output_tokens.cost': 0.0007700000000000001,
			'signoz.gen_ai.usage.tokens.cost': 0.0013775,
		},
		duration_nano: 1770290125,
		formatted_input: [
			{
				role: 'system',
				content: [
					{
						type: 'text',
						content:
							'You are a research assistant. Use the search-web and get-weather tools as needed.',
					},
				],
			},
			{
				role: 'user',
				content: [
					{
						type: 'text',
						content:
							'Search for SigNoz AI observability docs, then tell me the weather in Bengaluru.',
					},
				],
			},
			{
				role: 'assistant',
				content: [
					{
						type: 'tool_call',
						id: 'call_opFrOeFM5pF9PnXe6lWcl0ui',
						name: 'searchWeb',
						arguments: { query: 'SigNoz AI observability documentation' },
					},
					{
						type: 'tool_call',
						id: 'call_HxRE0JdcM3F32SCbIu3SGk3G',
						name: 'getWeather',
						arguments: { city: 'Bengaluru' },
					},
				],
			},
			{
				role: 'tool',
				content: [
					{
						type: 'tool_result',
						content:
							'{"query":"SigNoz AI observability documentation","results":[{"snippet":"AI observability ...","title":"SigNoz docs"},{"snippet":"semantic conventions ...","title":"OTel GenAI"}]}',
						name: 'searchWeb',
						toolCallId: 'call_opFrOeFM5pF9PnXe6lWcl0ui',
					},
					{
						type: 'tool_result',
						content: '{"city":"Bengaluru","summary":"Clear","temperatureC":18}',
						name: 'getWeather',
						toolCallId: 'call_HxRE0JdcM3F32SCbIu3SGk3G',
					},
				],
			},
		],
		formatted_output: [
			{
				content: [
					{
						type: 'text',
						content:
							'I found some information on SigNoz AI observability documentation. Here are a couple of relevant links:\n\n1. **SigNoz docs** - This includes details about AI observability.\n2. **OTel GenAI** - This document discusses semantic conventions related to observability.\n\nAs for the weather in Bengaluru, it is currently clear with a temperature of 18°C.',
					},
				],
			},
		],
		kind_string: 'Internal',
		name: 'ai.generateText.doGenerate',
		span_id: '6cee8072961624a0',
		time_unix: 1789627365000,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'[{"content": "A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much is the ball?", "role": "user"}]',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'{"id":"resp_017c5eb995d99968006a199f9b483481979ca790db905506fc","created_at":1780064155.0,"error":null,"instructions":"You solve problems step by step and give a final answer.","model":"o3-mini-2025-01-31","object":"response","output":[{"id":"rs_017c5eb995d99968006a199f9bff248197978bf9193f34c29a","summary":[],"type":"reasoning","content":null},{"id":"msg_017c5eb995d99968006a199f9c8dcc81979f4e10afbe5350a1","content":[{"annotations":[],"text":"Step 1: Let the cost of the ball be x dollars.\\nStep 2: Since the bat costs $1 more than the ball, its cost is x + 1 dollars.\\nStep 3: According to the problem, the total cost of the bat and ball is $1.10. Set up the equation:\\n  x + (x + 1) = 1.10\\nStep 4: Simplify the equation:\\n  2x + 1 = 1.10\\nStep 5: Subtract 1 from both sides:\\n  2x = 0.10\\nStep 6: Divide both sides by 2:\\n  x = 0.05\\n\\nFinal Answer: The ball costs $0.05.","type":"output_text","logprobs":[]}],"role":"assistant","status":"completed","type":"message"}],"status":"completed","usage":{"input_tokens":49,"input_tokens_details":{"cached_tokens":0},"output_tokens":431,"output_tokens_details":{"reasoning_tokens":128},"total_tokens":480}}',
			'gen_ai.request.model': 'o3-mini-2025-01-31',
			'gen_ai.usage.cache_read.input_tokens': 0,
			'gen_ai.usage.input_tokens': 49,
			'gen_ai.usage.output_tokens': 431,
			'gen_ai.usage.reasoning.output_tokens': 128,
			'signoz.gen_ai.usage.input_tokens.cost': 0.00012250000000000002,
			'signoz.gen_ai.usage.output_tokens.cost': 0.0043100000000000005,
			'signoz.gen_ai.usage.tokens.cost': 0.004432500000000001,
		},
		duration_nano: 2927763968,
		formatted_input: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						content:
							'A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much is the ball?',
					},
				],
			},
		],
		formatted_output: [
			{ role: 'assistant', content: [{ type: 'thinking' }] },
			{
				role: 'assistant',
				content: [
					{
						type: 'text',
						content:
							'Step 1: Let the cost of the ball be x dollars.\nStep 2: Since the bat costs $1 more than the ball, its cost is x + 1 dollars.\nStep 3: According to the problem, the total cost of the bat and ball is $1.10. Set up the equation:\n  x + (x + 1) = 1.10\nStep 4: Simplify the equation:\n  2x + 1 = 1.10\nStep 5: Subtract 1 from both sides:\n  2x = 0.10\nStep 6: Divide both sides by 2:\n  x = 0.05\n\nFinal Answer: The ball costs $0.05.',
					},
				],
				finishReason: 'stop',
			},
		],
		kind_string: 'Internal',
		name: 'response',
		span_id: '9d1af71602a60828',
		time_unix: 1789627367500,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'{"messages":[{"role":"user","content":"A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much is the ball?"}]}',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'{"completion":"Let x be the cost of the ball. Then the bat costs x + 1 dollars. The total cost is given as:\\n\\n  x + (x + 1) = 1.10\\n\\nCombine like terms:\\n\\n  2x + 1 = 1.10\\n\\nSubtract 1 from both sides:\\n\\n  2x = 0.10\\n\\nDivide both sides by 2:\\n\\n  x = 0.05\\n\\nSo, the ball costs 5 cents.","reasoning":"**Calculating ball price**\\n\\nI\'m determining the price of the ball based on a scenario where a bat and ball combined cost $1.10, with the bat costing $1 more than the ball. I set up the equation: let the cost of the ball be x, making the bat x + 1. Solving the equation x + (x + 1) = 1.10 leads me to find that x equals $0.05 for the ball. I need to confirm that this works: the ball at $0.05 and the bat at $1.05 totals $1.10.","rawRequest":{"model":"openai/o3-mini","max_completion_tokens":2000}}',
			'gen_ai.provider.name': 'openai',
			'gen_ai.request.model': 'openai/o3-mini',
			'gen_ai.usage.cache_read.input_tokens': 0,
			'gen_ai.usage.input_tokens': 33,
			'gen_ai.usage.output_tokens': 629,
			'gen_ai.usage.reasoning.output_tokens': 256,
			'signoz.gen_ai.usage.input_tokens.cost': 0.00008250000000000001,
			'signoz.gen_ai.usage.output_tokens.cost': 0.0062900000000000005,
			'signoz.gen_ai.usage.tokens.cost': 0.0063725000000000006,
		},
		duration_nano: 4209000000,
		formatted_input: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						content:
							'A bat and a ball cost $1.10. The bat costs $1 more than the ball. How much is the ball?',
					},
				],
			},
		],
		formatted_output: [
			{
				role: 'assistant',
				content: [
					{
						type: 'thinking',
						content:
							"**Calculating ball price**\n\nI'm determining the price of the ball based on a scenario where a bat and ball combined cost $1.10, with the bat costing $1 more than the ball. I set up the equation: let the cost of the ball be x, making the bat x + 1. Solving the equation x + (x + 1) = 1.10 leads me to find that x equals $0.05 for the ball. I need to confirm that this works: the ball at $0.05 and the bat at $1.05 totals $1.10.",
					},
					{
						type: 'text',
						content:
							'Let x be the cost of the ball. Then the bat costs x + 1 dollars. The total cost is given as:\n\n  x + (x + 1) = 1.10\n\nCombine like terms:\n\n  2x + 1 = 1.10\n\nSubtract 1 from both sides:\n\n  2x = 0.10\n\nDivide both sides by 2:\n\n  x = 0.05\n\nSo, the ball costs 5 cents.',
					},
				],
			},
		],
		kind_string: 'Client',
		name: 'LLM Generation',
		span_id: 'af95cec99712ad26',
		time_unix: 1789627370000,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'[{"role": "user", "parts": [{"type": "text", "content": "What\'s the weather in Bengaluru? Use the tool."}]}]',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'[{"role": "assistant", "parts": [], "finish_reason": "tool_calls"}]',
			'gen_ai.provider.name': 'openai',
			'gen_ai.request.model': 'gpt-4o-mini',
			'gen_ai.usage.input_tokens': 66,
			'gen_ai.usage.output_tokens': 18,
			'signoz.gen_ai.usage.input_tokens.cost': 0.00016500000000000003,
			'signoz.gen_ai.usage.output_tokens.cost': 0.00018,
			'signoz.gen_ai.usage.tokens.cost': 0.00034500000000000004,
		},
		duration_nano: 1652955648,
		formatted_input: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						content: "What's the weather in Bengaluru? Use the tool.",
					},
				],
			},
		],
		formatted_output: [
			{ role: 'assistant', content: [], finishReason: 'tool_call' },
		],
		kind_string: 'Internal',
		name: 'litellm_request',
		span_id: 'adfbedf6477f7f24',
		time_unix: 1789627372500,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'{"city": "Bengaluru", "temp_c": 28, "summary": "Partly cloudy"}',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'The current weather in Bengaluru is partly cloudy with a temperature of 28°C.',
			'gen_ai.provider.name': 'openai',
			'gen_ai.request.model': 'gpt-4o-mini',
		},
		duration_nano: 939838834,
		formatted_input: [
			{
				content: [
					{
						type: 'generic',
						content:
							'{"city": "Bengaluru", "temp_c": 28, "summary": "Partly cloudy"}',
					},
				],
			},
		],
		formatted_output: [
			{
				content: [
					{
						type: 'text',
						content:
							'The current weather in Bengaluru is partly cloudy with a temperature of 28°C.',
					},
				],
			},
		],
		kind_string: 'Server',
		name: '/openai/v1/chat/completions',
		span_id: '0ed3e2f860c741b9',
		time_unix: 1789627375000,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages': `[{"role": "user", "parts": [{"type": "text", "text": "What animal is in this image? One sentence."}, {"type": "image_url", "image_url": {"url": "${IMAGE_DATA_URL}"}}]}]`,
			'gen_ai.operation.name': 'chat',
			'gen_ai.provider.name': 'openai',
			'gen_ai.request.model': 'gpt-4o-mini',
		},
		duration_nano: 412100096,
		formatted_input: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						content: 'What animal is in this image? One sentence.',
					},
					{
						type: 'generic',
						content: `{"image_url":{"url":"${IMAGE_DATA_URL}"},"type":"image_url"}`,
					},
				],
			},
		],
		has_error: true,
		kind_string: 'Internal',
		name: 'litellm_request',
		span_id: '61c74044c542ed88',
		status_code: 2,
		status_code_string: 'Error',
		time_unix: 1789627377500,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'[{"role": "user", "parts": [{"type": "text", "content": "Stream a short haiku about telemetry."}]}]',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'[{"role": "unknown", "parts": [{"type": "text", "content": "Data whispers loud,  \\nSignals traverse through the night,  \\nTruth in every byte."}], "finish_reason": "stop"}]',
			'gen_ai.provider.name': 'openai',
			'gen_ai.request.model': 'gpt-4o-mini',
			'gen_ai.usage.cache_read.input_tokens': 0,
			'gen_ai.usage.input_tokens': 15,
			'gen_ai.usage.output_tokens': 17,
			'signoz.gen_ai.usage.input_tokens.cost': 0.000037500000000000003,
			'signoz.gen_ai.usage.output_tokens.cost': 0.00017,
			'signoz.gen_ai.usage.tokens.cost': 0.00020750000000000003,
		},
		duration_nano: 1129929000,
		formatted_input: [
			{
				role: 'user',
				content: [
					{ type: 'text', content: 'Stream a short haiku about telemetry.' },
				],
			},
		],
		formatted_output: [
			{
				role: 'unknown',
				content: [
					{
						type: 'text',
						content:
							'Data whispers loud,  \nSignals traverse through the night,  \nTruth in every byte.',
					},
				],
				finishReason: 'stop',
			},
		],
		kind_string: 'Client',
		name: 'ChatOpenAI.chat',
		span_id: 'e9d08ec1ac3417d5',
		time_unix: 1789627380000,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages': JSON.stringify([
				{ role: 'system', content: OBSERVABILITY_PROMPT },
				{
					role: 'user',
					content: [
						{ type: 'text', text: 'In one sentence, what is observability?' },
					],
				},
			]),
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				"Observability is the ability to understand a system's internal state through the telemetry it emits, such as traces, metrics, and logs.",
			'gen_ai.provider.name': 'openai.chat',
			'gen_ai.request.model': 'gpt-4o-mini',
			'gen_ai.usage.input_tokens': 1371,
			'gen_ai.usage.output_tokens': 27,
			'signoz.gen_ai.usage.input_tokens.cost': 0.0034275000000000004,
			'signoz.gen_ai.usage.output_tokens.cost': 0.00027,
			'signoz.gen_ai.usage.tokens.cost': 0.0036975000000000003,
		},
		duration_nano: 959577625,
		formatted_input: [
			{
				role: 'system',
				content: [{ type: 'text', content: OBSERVABILITY_PROMPT }],
			},
			{
				role: 'user',
				content: [
					{ type: 'text', content: 'In one sentence, what is observability?' },
				],
			},
		],
		formatted_output: [
			{
				content: [
					{
						type: 'text',
						content:
							"Observability is the ability to understand a system's internal state through the telemetry it emits, such as traces, metrics, and logs.",
					},
				],
			},
		],
		kind_string: 'Internal',
		name: 'ai.generateText.doGenerate',
		span_id: '6bf32b44d3456393',
		time_unix: 1789627382500,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'[{"role":"user","content":"List three things to pack for Paris in October."}]',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'[{"role":"assistant","content":"1. A light waterproof jacket\\n2. Comfortable walking shoes\\n3. A","finish_reason":"length"}]',
			'gen_ai.provider.name': 'openai',
			'gen_ai.request.model': 'gpt-4o',
			'gen_ai.usage.input_tokens': 18,
			'gen_ai.usage.output_tokens': 16,
			'signoz.gen_ai.usage.input_tokens.cost': 0.000045,
			'signoz.gen_ai.usage.output_tokens.cost': 0.00016,
			'signoz.gen_ai.usage.tokens.cost': 0.00020500000000000002,
		},
		duration_nano: 900000000,
		formatted_input: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						content: 'List three things to pack for Paris in October.',
					},
				],
			},
		],
		formatted_output: [
			{
				role: 'assistant',
				content: [
					{
						type: 'text',
						content:
							'1. A light waterproof jacket\n2. Comfortable walking shoes\n3. A',
					},
				],
				finishReason: 'length',
			},
		],
		kind_string: 'Client',
		name: 'chat gpt-4o',
		span_id: '5e00000000000001',
		time_unix: 1789627385000,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'[{"role":"user","content":"Write a fake 5-star review for my hotel."}]',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'[{"role":"assistant","content":null,"refusal":"I can\'t help write fake reviews.","finish_reason":"content_filter"}]',
			'gen_ai.provider.name': 'openai',
			'gen_ai.request.model': 'gpt-4o',
			'gen_ai.usage.input_tokens': 15,
			'gen_ai.usage.output_tokens': 9,
			'signoz.gen_ai.usage.input_tokens.cost': 0.000037500000000000003,
			'signoz.gen_ai.usage.output_tokens.cost': 0.00009,
			'signoz.gen_ai.usage.tokens.cost': 0.0001275,
		},
		duration_nano: 900000000,
		formatted_input: [
			{
				role: 'user',
				content: [
					{ type: 'text', content: 'Write a fake 5-star review for my hotel.' },
				],
			},
		],
		formatted_output: [
			{
				role: 'assistant',
				content: [{ type: 'text', content: "I can't help write fake reviews." }],
				finishReason: 'content_filter',
			},
		],
		kind_string: 'Client',
		name: 'chat gpt-4o',
		span_id: '5e00000000000002',
		time_unix: 1789627387500,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'[{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_01","content":[{"type":"text","text":"rate limited, retry after 30s"}],"is_error":true}]}]',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'[{"role":"assistant","content":[{"type":"text","text":"The booking API is rate limited, retrying."},{"type":"tool_use","id":"toolu_02","name":"book_hotel","input":{"city":"Paris","nights":2}}],"stop_reason":"tool_use"}]',
			'gen_ai.provider.name': 'anthropic',
			'gen_ai.request.model': 'claude-sonnet-4',
			'gen_ai.usage.input_tokens': 210,
			'gen_ai.usage.output_tokens': 48,
			'signoz.gen_ai.usage.input_tokens.cost': 0.0005250000000000001,
			'signoz.gen_ai.usage.output_tokens.cost': 0.00048000000000000007,
			'signoz.gen_ai.usage.tokens.cost': 0.001005,
		},
		duration_nano: 900000000,
		formatted_input: [
			{
				role: 'user',
				content: [
					{
						type: 'tool_result',
						content: 'rate limited, retry after 30s',
						toolCallId: 'toolu_01',
						isError: true,
					},
				],
			},
		],
		formatted_output: [
			{
				role: 'assistant',
				content: [
					{ type: 'text', content: 'The booking API is rate limited, retrying.' },
					{
						type: 'tool_call',
						id: 'toolu_02',
						name: 'book_hotel',
						arguments: { city: 'Paris', nights: 2 },
					},
				],
				finishReason: 'tool_call',
			},
		],
		kind_string: 'Client',
		name: 'chat claude-sonnet-4',
		span_id: '5e00000000000003',
		time_unix: 1789627390000,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'[{"role":"system","content":"Reply with JSON only."},{"role":"user","content":"Extract city and nights: two nights in Paris"}]',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'[{"role":"assistant","content":"{\\"city\\":\\"Paris\\",\\"nights\\":2}","finish_reason":"stop"}]',
			'gen_ai.provider.name': 'openai',
			'gen_ai.request.model': 'gpt-4o-mini',
			'gen_ai.usage.input_tokens': 31,
			'gen_ai.usage.output_tokens': 11,
			'signoz.gen_ai.usage.input_tokens.cost': 0.0000775,
			'signoz.gen_ai.usage.output_tokens.cost': 0.00011,
			'signoz.gen_ai.usage.tokens.cost': 0.0001875,
		},
		duration_nano: 900000000,
		formatted_input: [
			{
				role: 'system',
				content: [{ type: 'text', content: 'Reply with JSON only.' }],
			},
			{
				role: 'user',
				content: [
					{
						type: 'text',
						content: 'Extract city and nights: two nights in Paris',
					},
				],
			},
		],
		formatted_output: [
			{
				role: 'assistant',
				content: [{ type: 'text', content: '{"city":"Paris","nights":2}' }],
				finishReason: 'stop',
			},
		],
		kind_string: 'Client',
		name: 'chat gpt-4o-mini',
		span_id: '5e00000000000004',
		time_unix: 1789627392500,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'[{"role":"user","content":"Weather in Paris and Tokyo?"}]',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'[{"role":"assistant","content":null,"tool_calls":[{"id":"call_a","type":"function","function":{"name":"get_weather","arguments":"{\\"city\\":\\"Paris\\"}"}},{"id":"call_b","type":"function","function":{"name":"get_weather","arguments":"{\\"city\\":\\"Tok"}}],"finish_reason":"tool_calls"}]',
			'gen_ai.provider.name': 'openai',
			'gen_ai.request.model': 'gpt-4o',
			'gen_ai.usage.input_tokens': 40,
			'gen_ai.usage.output_tokens': 30,
			'signoz.gen_ai.usage.input_tokens.cost': 0.0001,
			'signoz.gen_ai.usage.output_tokens.cost': 0.00030000000000000003,
			'signoz.gen_ai.usage.tokens.cost': 0.0004,
		},
		duration_nano: 900000000,
		formatted_input: [
			{
				role: 'user',
				content: [{ type: 'text', content: 'Weather in Paris and Tokyo?' }],
			},
		],
		formatted_output: [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool_call',
						id: 'call_a',
						name: 'get_weather',
						arguments: { city: 'Paris' },
					},
					{
						type: 'tool_call',
						id: 'call_b',
						name: 'get_weather',
						arguments: '{"city":"Tok',
					},
				],
				finishReason: 'tool_call',
			},
		],
		kind_string: 'Client',
		name: 'chat gpt-4o',
		span_id: '5e00000000000005',
		time_unix: 1789627395000,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'[{"role":"user","content":"Summarise the trip plan."}]',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'[{"role":"assistant","content":[{"type":"text","text":"Paris, 2 nights, arriving"}],"stop_reason":"pause_turn"}]',
			'gen_ai.provider.name': 'anthropic',
			'gen_ai.request.model': 'claude-sonnet-4',
			'gen_ai.usage.input_tokens': 22,
			'gen_ai.usage.output_tokens': 7,
			'signoz.gen_ai.usage.input_tokens.cost': 0.000055,
			'signoz.gen_ai.usage.output_tokens.cost': 0.00007000000000000001,
			'signoz.gen_ai.usage.tokens.cost': 0.000125,
		},
		duration_nano: 900000000,
		formatted_input: [
			{
				role: 'user',
				content: [{ type: 'text', content: 'Summarise the trip plan.' }],
			},
		],
		formatted_output: [
			{
				role: 'assistant',
				content: [{ type: 'text', content: 'Paris, 2 nights, arriving' }],
				finishReason: 'pause_turn',
			},
		],
		kind_string: 'Client',
		name: 'chat claude-sonnet-4',
		span_id: '5e00000000000006',
		time_unix: 1789627397500,
	},
	{
		...SPAN_DEFAULTS,
		attributes: {
			'gen_ai.input.messages':
				'[{"role":"user","content":"Confirm the booking."}]',
			'gen_ai.operation.name': 'chat',
			'gen_ai.output.messages':
				'[{"role":"assistant","content":"Booking failed upstream.","finish_reason":"error"}]',
			'gen_ai.provider.name': 'openai',
			'gen_ai.request.model': 'gpt-4o',
			'gen_ai.usage.input_tokens': 12,
			'gen_ai.usage.output_tokens': 5,
			'signoz.gen_ai.usage.input_tokens.cost': 0.000030000000000000004,
			'signoz.gen_ai.usage.output_tokens.cost': 0.00005,
			'signoz.gen_ai.usage.tokens.cost': 0.00008,
		},
		duration_nano: 900000000,
		formatted_input: [
			{
				role: 'user',
				content: [{ type: 'text', content: 'Confirm the booking.' }],
			},
		],
		formatted_output: [
			{
				role: 'assistant',
				content: [{ type: 'text', content: 'Booking failed upstream.' }],
				finishReason: 'error',
			},
		],
		has_error: true,
		kind_string: 'Client',
		name: 'chat gpt-4o',
		span_id: '5e00000000000007',
		status_code: 2,
		status_code_string: 'Error',
		time_unix: 1789627400000,
	},
];
