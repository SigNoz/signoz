import { useCallback, useState } from 'react';
import {
	RenderErrorResponseDTO,
	SpantypesSpanMapperTestSpanDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useTestSpanMappers } from 'api/generated/services/spanmapper';
import { AxiosError } from 'axios';

import { buildTestRequest } from './testPayload';
import { DraftGroup } from './types';

// Pre-filled sample so the tab is runnable on first open (mirrors the design).
export const SAMPLE_SPAN_JSON = `{
  "my_company.llm.input": "What is quantum computing?",
  "llm.input_messages": "What is quantum computing?",
  "gen_ai.request.model": "gpt-4",
  "gen_ai.usage.total_tokens": 1250,
  "gen_ai.content.completion": "Quantum computing leverages..."
}`;

function apiErrorMessage(error: unknown): string {
	const axiosError = error as AxiosError<RenderErrorResponseDTO>;
	return (
		axiosError?.response?.data?.error?.message ??
		(error instanceof Error ? error.message : 'Test failed. Please try again.')
	);
}

export interface UseTestSpanMapper {
	input: string;
	setInput: (value: string) => void;
	run: () => void;
	reset: () => void;
	isRunning: boolean;
	result: SpantypesSpanMapperTestSpanDTO[] | null;
	// The attributes that were actually submitted with the last successful run,
	// so the result diff stays stable even if the textarea is edited afterwards.
	testedAttributes: Record<string, unknown> | null;
	error: string | null;
}

// Owns the Test tab's local state: the pasted span JSON, the parsed/built
// request, and the result/error of the test mutation. Builds the request from
// the working draft (sending only changed groups' mappers — see testPayload).
export function useTestSpanMapper(
	snapshot: DraftGroup[],
	draft: DraftGroup[],
): UseTestSpanMapper {
	const [input, setInput] = useState<string>(SAMPLE_SPAN_JSON);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<SpantypesSpanMapperTestSpanDTO[] | null>(
		null,
	);
	const [testedAttributes, setTestedAttributes] = useState<Record<
		string,
		unknown
	> | null>(null);

	const { mutate, isLoading } = useTestSpanMappers();

	const run = useCallback((): void => {
		setError(null);

		let body;
		try {
			body = buildTestRequest(snapshot, draft, input);
		} catch (parseError) {
			setResult(null);
			setError(apiErrorMessage(parseError));
			return;
		}

		const submittedAttributes = (body.spans?.[0]?.attributes ?? {}) as Record<
			string,
			unknown
		>;

		mutate(
			{ data: body },
			{
				onSuccess: (response) => {
					setTestedAttributes(submittedAttributes);
					setResult(response.data?.spans ?? []);
				},
				onError: (mutationError) => {
					setResult(null);
					setError(apiErrorMessage(mutationError));
				},
			},
		);
	}, [snapshot, draft, input, mutate]);

	const reset = useCallback((): void => {
		setError(null);
		setResult(null);
		setTestedAttributes(null);
	}, []);

	return {
		input,
		setInput,
		run,
		reset,
		isRunning: isLoading,
		result,
		testedAttributes,
		error,
	};
}
