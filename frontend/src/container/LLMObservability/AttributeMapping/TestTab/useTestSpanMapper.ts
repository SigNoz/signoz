import { useCallback, useMemo, useState } from 'react';
import {
	RenderErrorResponseDTO,
	SpantypesSpanMapperTestSpanDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useTestSpanMappers } from 'api/generated/services/spanmapper';
import { AxiosError } from 'axios';

import { buildTestRequest, parseSpanInput } from './testPayload';
import { DraftGroup } from '../types';

export type TestTabAttributes = Record<string, unknown>;
export type TestTabResource = Record<string, unknown>;

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
	validationError: string | null;
	result: SpantypesSpanMapperTestSpanDTO[] | null;
	testedAttributes: TestTabAttributes | null;
	testedResource: TestTabResource | null;
	error: string | null;
}

export function useTestSpanMapper(
	snapshot: DraftGroup[],
	draft: DraftGroup[],
): UseTestSpanMapper {
	const [input, setInput] = useState<string>(SAMPLE_SPAN_JSON);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<SpantypesSpanMapperTestSpanDTO[] | null>(
		null,
	);
	const [testedAttributes, setTestedAttributes] =
		useState<TestTabAttributes | null>(null);
	const [testedResource, setTestedResource] = useState<TestTabResource | null>(
		null,
	);

	const { mutate, isLoading } = useTestSpanMappers();

	const validationError = useMemo((): string | null => {
		try {
			parseSpanInput(input);
			return null;
		} catch (err) {
			return err instanceof Error ? err.message : 'Invalid span JSON.';
		}
	}, [input]);

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

		const submittedSpan = body.spans?.[0];
		const submittedAttributes = (submittedSpan?.attributes ??
			{}) as TestTabAttributes;
		const submittedResource = (submittedSpan?.resource ?? {}) as TestTabResource;

		mutate(
			{ data: body },
			{
				onSuccess: (response) => {
					setTestedAttributes(submittedAttributes);
					setTestedResource(submittedResource);
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
		setTestedResource(null);
	}, []);

	return {
		input,
		setInput,
		run,
		reset,
		isRunning: isLoading,
		validationError,
		result,
		testedAttributes,
		testedResource,
		error,
	};
}
