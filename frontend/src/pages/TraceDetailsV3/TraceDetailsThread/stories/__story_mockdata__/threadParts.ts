/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { AiobservabilitytypesReasoningPartDTOType } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesReasoningPartDTOType';
import { AiobservabilitytypesTextPartDTOType } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesTextPartDTOType';
import { AiobservabilitytypesToolCallRequestPartDTOType } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesToolCallRequestPartDTOType';
import { AiobservabilitytypesToolCallResponsePartDTOType } from 'api/generated/services/sigNoz.schemas/aiobservabilitytypesToolCallResponsePartDTOType';

import type { InputMessage, OutputMessage, Part } from './types';

export const text = (content: string): Part => ({
	type: AiobservabilitytypesTextPartDTOType.text,
	content,
});

export const reasoning = (content: string): Part => ({
	type: AiobservabilitytypesReasoningPartDTOType.reasoning,
	content,
});

export const toolCall = (id: string, name: string, args: unknown): Part => ({
	type: AiobservabilitytypesToolCallRequestPartDTOType.tool_call,
	id,
	name,
	arguments: args,
});

export const toolResult = (id: string, response: unknown): Part => ({
	type: AiobservabilitytypesToolCallResponsePartDTOType.tool_call_response,
	id,
	response,
});

export const input = (role: string, parts: Part[]): InputMessage => ({
	role,
	parts,
});

export const output = (
	role: string,
	parts: Part[],
	finishReason?: string,
): OutputMessage => ({ role, parts, finish_reason: finishReason });

export const WEATHER_CALL = 'call_aA3FJchumEvBrIxxheORri8j';
export const WEATHER = { city: 'Bengaluru', unit: 'c' };
export const WEATHER_RESULT = {
	city: 'Bengaluru',
	unit: 'c',
	temperature: 27,
	condition: 'partly cloudy',
};
export const QUESTION =
	'What is the weather in Bengaluru in celsius, and do I need an umbrella?';
export const SYSTEM_PROMPT =
	'You are a travel assistant. Use the tools you have before answering, and keep answers short.';
