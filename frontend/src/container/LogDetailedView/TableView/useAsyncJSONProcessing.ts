/* eslint-disable sonarjs/no-duplicate-string */
import { isEmpty } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';

import { jsonToDataNodes, recursiveParseJSON } from '../utils';

const MAX_BODY_BYTES = 100 * 1024; // 100 KB

// Hook for async JSON processing
const useAsyncJSONProcessing = (
	value: string,
	shouldProcess: boolean,
): {
	isLoading: boolean;
	treeData: any[] | null;
	error: string | null;
} => {
	const [jsonState, setJsonState] = useState<{
		isLoading: boolean;
		treeData: any[] | null;
		error: string | null;
	}>({
		isLoading: false,
		treeData: null,
		error: null,
	});

	const processingRef = useRef<boolean>(false);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect((): (() => void) => {
		if (!shouldProcess || processingRef.current) {
			return (): void => {};
		}

		// Avoid processing if the json is too large
		const byteSize = new Blob([value]).size;
		if (byteSize > MAX_BODY_BYTES) {
			return (): void => {};
		}

		processingRef.current = true;
		setJsonState({ isLoading: true, treeData: null, error: null });

		// Option 1: Using setTimeout for non-blocking processing
		const processAsync = (): void => {
			setTimeout(() => {
				try {
					const parsedBody = recursiveParseJSON(value);
					if (!isEmpty(parsedBody)) {
						const treeData = jsonToDataNodes(parsedBody);
						setJsonState({ isLoading: false, treeData, error: null });
					} else {
						setJsonState({ isLoading: false, treeData: null, error: null });
					}
				} catch (error) {
					setJsonState({
						isLoading: false,
						treeData: null,
						error: error instanceof Error ? error.message : 'Parsing failed',
					});
				} finally {
					processingRef.current = false;
				}
			}, 0);
		};

		// Option 2: Using requestIdleCallback for better performance
		const processWithIdleCallback = (): void => {
			if ('requestIdleCallback' in window) {
				requestIdleCallback(
					// eslint-disable-next-line sonarjs/no-identical-functions
					(): void => {
						try {
							const parsedBody = recursiveParseJSON(value);
							if (!isEmpty(parsedBody)) {
								const treeData = jsonToDataNodes(parsedBody);
								setJsonState({ isLoading: false, treeData, error: null });
							} else {
								setJsonState({ isLoading: false, treeData: null, error: null });
							}
						} catch (error) {
							setJsonState({
								isLoading: false,
								treeData: null,
								error: error instanceof Error ? error.message : 'Parsing failed',
							});
						} finally {
							processingRef.current = false;
						}
					},
					{ timeout: 1000 },
				);
			} else {
				processAsync();
			}
		};

		processWithIdleCallback();

		// Cleanup function
		return (): void => {
			processingRef.current = false;
		};
	}, [value, shouldProcess]);

	return jsonState;
};

export default useAsyncJSONProcessing;
