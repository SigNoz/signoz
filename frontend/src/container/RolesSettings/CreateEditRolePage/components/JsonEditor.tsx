import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useState,
	useRef,
} from 'react';
import { useCopyToClipboard } from 'react-use';
import MEditor, { Monaco, OnMount } from '@monaco-editor/react';
import { Color } from '@signozhq/design-tokens';
import { Check, Copy } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import type { AuthtypesTransactionGroupDTO } from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';

import {
	defineJsonTheme,
	EDITABLE_EDITOR_OPTIONS,
	JSON_THEME_DARK,
} from '../../monaco.config';
import {
	transformResourcePermissionsToTransactionGroups,
	transformTransactionGroupsToResourcePermissions,
} from '../../hooks/useRolePermissions';
import {
	registerCompletionProvider,
	registerJsonSchema,
	ROLE_PERMISSIONS_MODEL_PATH,
} from './jsonSchema.config';

import styles from './JsonEditor.module.scss';
import { JsonEditorProps, JsonEditorRef } from './JsonEditor.types';

type MonacoEditor = Parameters<OnMount>[0];

const JsonEditor = forwardRef<JsonEditorRef, JsonEditorProps>(
	function JsonEditor({ resources, mode, onChange, onValidityChange }, ref) {
		const isDarkMode = useIsDarkMode();
		const [copyState, copyToClipboard] = useCopyToClipboard();
		const [copied, setCopied] = useState(false);
		const [parseError, setParseError] = useState<string | null>(null);
		const [schemaErrors, setSchemaErrors] = useState<string[]>([]);
		const [jsonBuffer, setJsonBuffer] = useState<string>(() => {
			const transactionGroups =
				transformResourcePermissionsToTransactionGroups(resources);
			return JSON.stringify(transactionGroups, null, 2);
		});
		const prevModeRef = useRef(mode);
		const completionDisposableRef = useRef<{ dispose(): void } | null>(null);
		const editorRef = useRef<MonacoEditor | null>(null);
		const markersListenerRef = useRef<{ dispose(): void } | null>(null);

		const hasError = parseError !== null || schemaErrors.length > 0;

		useImperativeHandle(ref, () => ({
			hasParseError: (): boolean => hasError,
		}));

		useEffect(() => {
			onValidityChange?.(hasError);
		}, [hasError, onValidityChange]);

		// Reinitialize buffer when switching from interactive to json mode
		useEffect(() => {
			const wasInteractive = prevModeRef.current === 'interactive';
			const isNowJson = mode === 'json';

			if (wasInteractive && isNowJson) {
				const transactionGroups =
					transformResourcePermissionsToTransactionGroups(resources);
				setJsonBuffer(JSON.stringify(transactionGroups, null, 2));
				setParseError(null);
			}

			prevModeRef.current = mode;
		}, [mode, resources]);

		const handleEditorChange = useCallback(
			(value: string | undefined): void => {
				if (!value) {
					return;
				}

				setJsonBuffer(value);

				try {
					const parsed = JSON.parse(value) as AuthtypesTransactionGroupDTO[];
					const resourcePermissions =
						transformTransactionGroupsToResourcePermissions(parsed);
					setParseError(null);
					onChange(resourcePermissions);
				} catch (err) {
					setParseError(err instanceof Error ? err.message : 'Invalid JSON format');
				}
			},
			[onChange],
		);

		const configureMonaco = useCallback((monaco: Monaco): void => {
			defineJsonTheme(monaco);
			registerJsonSchema(monaco);
			completionDisposableRef.current = registerCompletionProvider(monaco);
		}, []);

		const handleEditorMount: OnMount = useCallback((editorInstance, monaco) => {
			editorRef.current = editorInstance;

			type MonacoMarker = ReturnType<typeof monaco.editor.getModelMarkers>[number];

			markersListenerRef.current = monaco.editor.onDidChangeMarkers(
				(uris: readonly Parameters<typeof monaco.Uri.parse>[0][]) => {
					const model = editorInstance.getModel();
					if (!model) {
						return;
					}

					const modelUri = model.uri.toString();
					const hasRelevantChange = uris.some((uri) => uri.toString() === modelUri);
					if (!hasRelevantChange) {
						return;
					}

					const markers = monaco.editor.getModelMarkers({ resource: model.uri });
					const errors = markers
						.filter(
							(marker: MonacoMarker) =>
								marker.severity === monaco.MarkerSeverity.Error,
						)
						.map(
							(marker: MonacoMarker) =>
								`Line ${marker.startLineNumber}: ${marker.message}`,
						);

					setSchemaErrors(errors);
				},
			);
		}, []);

		useEffect(
			() => (): void => {
				completionDisposableRef.current?.dispose();
				markersListenerRef.current?.dispose();
			},
			[],
		);

		useEffect(() => {
			if (copyState.value) {
				setCopied(true);
				const timer = setTimeout(() => setCopied(false), 1500);
				return (): void => clearTimeout(timer);
			}
			return undefined;
		}, [copyState]);

		const handleCopy = useCallback((): void => {
			copyToClipboard(jsonBuffer);
		}, [copyToClipboard, jsonBuffer]);

		return (
			<div className={styles.jsonEditor} data-testid="json-editor">
				<div className={styles.jsonEditorContainer}>
					<TooltipSimple title={copied ? 'Copied!' : 'Copy JSON'}>
						<Button
							variant="ghost"
							size="sm"
							className={styles.copyButton}
							onClick={handleCopy}
						>
							{copied ? (
								<Check size={14} color={Color.BG_FOREST_400} />
							) : (
								<Copy
									size={14}
									color={isDarkMode ? Color.BG_VANILLA_400 : Color.TEXT_INK_400}
								/>
							)}
						</Button>
					</TooltipSimple>
					<MEditor
						value={jsonBuffer}
						language="json"
						path={ROLE_PERMISSIONS_MODEL_PATH}
						options={EDITABLE_EDITOR_OPTIONS}
						onChange={handleEditorChange}
						onMount={handleEditorMount}
						height="100%"
						theme={isDarkMode ? JSON_THEME_DARK : 'light'}
						beforeMount={configureMonaco}
					/>
				</div>
				<div className={styles.jsonEditorErrorWrapper}>
					{parseError && (
						<div className={styles.jsonEditorError} data-testid="json-editor-error">
							<Typography as="span" size="base" weight="medium">
								Parse Error:
							</Typography>
							<Typography
								as="span"
								size="base"
								className={styles.jsonEditorErrorMessage}
							>
								{parseError}
							</Typography>
						</div>
					)}
					{!parseError && schemaErrors.length > 0 && (
						<div
							className={styles.jsonEditorError}
							data-testid="json-editor-schema-error"
						>
							<Typography as="span" size="base" weight="medium">
								Schema Error:
							</Typography>
							<Typography
								as="span"
								size="base"
								className={styles.jsonEditorErrorMessage}
							>
								{schemaErrors[0]}
								{schemaErrors.length > 1 && ` (+${schemaErrors.length - 1} more)`}
							</Typography>
						</div>
					)}
				</div>
			</div>
		);
	},
);

export default JsonEditor;
