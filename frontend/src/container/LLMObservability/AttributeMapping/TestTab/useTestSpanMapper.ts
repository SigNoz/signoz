import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	RenderErrorResponseDTO,
	SpantypesSpanMapperTestSpanDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useTestSpanMappers } from 'api/generated/services/spanmapper';
import { AxiosError } from 'axios';
import { debounce } from 'lodash-es';

import { buildTestRequest, parseSpanInput } from './testPayload';
import {
	clearStoredSpanInput,
	getStoredSpanInput,
	SAMPLE_SPAN_JSON,
	setStoredSpanInput,
} from './spanInputStorage';
import { DraftGroup } from '../types';

export type TestTabAttributes = Record<string, unknown>;
export type TestTabResource = Record<string, unknown>;

const PERSIST_DEBOUNCE_MS = 500;

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
	resetToTemplate: () => void;
	isTemplateInput: boolean;
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
	const [input, setInputValue] = useState<string>(getStoredSpanInput);
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

	const persistInput = useMemo(
		() => debounce(setStoredSpanInput, PERSIST_DEBOUNCE_MS),
		[],
	);

	useEffect(
		() => (): void => {
			persistInput.flush();
		},
		[persistInput],
	);

	const setInput = useCallback(
		(value: string): void => {
			setInputValue(value);
			persistInput(value);
		},
		[persistInput],
	);

	const validationError = useMemo((): string | null => {
		try {
			parseSpanInput(input);
			return null;
		} catch (err) {
			return err instanceof Error ? err.message : 'Invalid span JSON.';
		}
	}, [input]);

	const reset = useCallback((): void => {
		setError(null);
		setResult(null);
		setTestedAttributes(null);
		setTestedResource(null);
	}, []);

	const resetToTemplate = useCallback((): void => {
		persistInput.cancel();
		clearStoredSpanInput();
		setInputValue(SAMPLE_SPAN_JSON);
		reset();
	}, [persistInput, reset]);

	const isTemplateInput = input.trim() === SAMPLE_SPAN_JSON;

	const run = useCallback((): void => {
		reset();

		let body;
		try {
			body = buildTestRequest(snapshot, draft, input);
		} catch (parseError) {
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
	}, [snapshot, draft, input, mutate, reset]);

	return {
		input,
		setInput,
		run,
		reset,
		resetToTemplate,
		isTemplateInput,
		isRunning: isLoading,
		validationError,
		result,
		testedAttributes,
		testedResource,
		error,
	};
}
