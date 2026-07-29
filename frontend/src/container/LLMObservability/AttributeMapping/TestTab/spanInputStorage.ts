import getLocalStorageApi from 'api/browser/localstorage/get';
import removeLocalStorageApi from 'api/browser/localstorage/remove';
import setLocalStorageApi from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';

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

export function getStoredSpanInput(): string {
	const stored = getLocalStorageApi(
		LOCALSTORAGE.LLM_ATTRIBUTE_MAPPING_TEST_SPAN,
	);
	return stored?.trim() ? stored : SAMPLE_SPAN_JSON;
}

export function setStoredSpanInput(value: string): void {
	if (!value.trim()) {
		removeLocalStorageApi(LOCALSTORAGE.LLM_ATTRIBUTE_MAPPING_TEST_SPAN);
		return;
	}
	setLocalStorageApi(LOCALSTORAGE.LLM_ATTRIBUTE_MAPPING_TEST_SPAN, value);
}
