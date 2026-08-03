import get from 'api/browser/localstorage/get';
import remove from 'api/browser/localstorage/remove';
import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

import { parseSpanInput } from './testPayload';

export const SAMPLE_SPAN_JSON = `{
  "attributes": {
    "my_company.llm.input": "What is quantum computing?",
    "llm.input_messages": "What is quantum computing?",
    "gen_ai.request.model": "gpt-4",
    "gen_ai.usage.total_tokens": 1250,
    "gen_ai.content.completion": "Quantum computing leverages..."
  },
  "resource": {
    "service.name": "llm-gateway",
    "deployment.environment": "production"
  }
}`;

function hasNoSpanData(input: string): boolean {
	let span;
	try {
		span = parseSpanInput(input);
	} catch {
		return false;
	}
	return (
		Object.keys(span.attributes ?? {}).length === 0 &&
		Object.keys(span.resource ?? {}).length === 0
	);
}

export function getStoredSpanInput(): string {
	const stored = get(LOCALSTORAGE.LLM_ATTRIBUTE_MAPPING_TEST_SPAN);
	if (!stored?.trim() || hasNoSpanData(stored)) {
		return SAMPLE_SPAN_JSON;
	}
	return stored;
}

export function setStoredSpanInput(value: string): void {
	if (!value.trim() || hasNoSpanData(value)) {
		remove(LOCALSTORAGE.LLM_ATTRIBUTE_MAPPING_TEST_SPAN);
		return;
	}
	set(LOCALSTORAGE.LLM_ATTRIBUTE_MAPPING_TEST_SPAN, value);
}

export function clearStoredSpanInput(): void {
	remove(LOCALSTORAGE.LLM_ATTRIBUTE_MAPPING_TEST_SPAN);
}
