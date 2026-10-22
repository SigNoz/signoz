import get from 'api/browser/localstorage/get';
import remove from 'api/browser/localstorage/remove';
import set from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

import { parseSpanInput } from './testPayload';

export const SAMPLE_SPAN_JSON = `{
  "attributes": {
    "llm.model_name": "gpt-4o",
    "llm.provider": "openai",
    "llm.token_count.prompt": 1024,
    "llm.token_count.completion": 226,
    "llm.token_count.prompt_details.cache_read": 512,
    "input.value": "What is quantum computing?",
    "output.value": "Quantum computing leverages superposition and entanglement...",
    "session.id": "chat-8f2e41"
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
