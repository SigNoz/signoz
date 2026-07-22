import MEditor from '@monaco-editor/react';
import { Play } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Callout } from '@signozhq/ui/callout';
import { useIsDarkMode } from 'hooks/useDarkMode';

import styles from './TestTab.module.scss';
import JsonEditorSkeleton from './JsonEditorSkeleton';
import TestResult from './TestResult';
import { AttributeMappingEditor } from '../hooks/useAttributeMappingEditor';
import {
	defineSignozJsonTheme,
	SIGNOZ_JSON_THEME_DARK,
	SIGNOZ_JSON_THEME_LIGHT,
} from './jsonEditorTheme';
import { useTestSpanMapper } from './useTestSpanMapper';

interface TestTabProps {
	editor: AttributeMappingEditor;
}

function TestTab({ editor }: TestTabProps): JSX.Element {
	const {
		input,
		setInput,
		run,
		isRunning,
		result,
		testedAttributes,
		testedResource,
		error,
		validationError,
	} = useTestSpanMapper(editor.snapshot, editor.groups);
	const isDarkMode = useIsDarkMode();

	function renderResults(): JSX.Element {
		if (error) {
			return (
				<div className={styles.error} role="alert" data-testid="test-error">
					{error}
				</div>
			);
		}
		if (result) {
			if (result.length === 0) {
				return (
					<div className={styles.resultEmpty} data-testid="test-results-empty">
						No spans returned. The mappers produced no output for this input.
					</div>
				);
			}
			return (
				<div className={styles.results} data-testid="test-results">
					{result.map((span, index) => (
						<TestResult
							// eslint-disable-next-line react/no-array-index-key
							key={index}
							index={index}
							span={span}
							inputAttributes={testedAttributes ?? {}}
							inputResource={testedResource ?? {}}
						/>
					))}
				</div>
			);
		}
		return (
			<div className={styles.placeholder} data-testid="test-results-placeholder">
				<span className={styles.placeholderTitle}>No results yet</span>
				<span>
					Run the test to see which target attributes your mappers populate.
				</span>
			</div>
		);
	}

	return (
		<div className={styles.testTab} data-testid="test-tab">
			<div className={styles.header}>
				<div className={styles.headerText}>
					<h3 className={styles.heading}>Test with sample span</h3>
					<p className={styles.description}>
						Paste a JSON span object to see which target attributes get populated and
						which source key matched.
					</p>
				</div>

				<Button
					testId="run-test-button"
					variant="solid"
					color="primary"
					prefix={<Play size={14} />}
					onClick={run}
					loading={isRunning}
					disabled={isRunning || validationError !== null}
				>
					Run Test
				</Button>
			</div>

			<div className={styles.body}>
				<div
					className={styles.editor}
					data-testid="test-span-input"
					aria-label="Sample span JSON"
				>
					<MEditor
						language="json"
						value={input}
						onChange={(value): void => setInput(value ?? '')}
						height="100%"
						loading={<JsonEditorSkeleton />}
						theme={isDarkMode ? SIGNOZ_JSON_THEME_DARK : SIGNOZ_JSON_THEME_LIGHT}
						beforeMount={defineSignozJsonTheme}
						options={{
							minimap: { enabled: false },
							fontSize: 12,
							lineNumbers: 'on',
							wordWrap: 'on',
							scrollBeyondLastLine: false,
							formatOnPaste: true,
							tabSize: 2,
							automaticLayout: true,
							scrollbar: { alwaysConsumeMouseWheel: false },
						}}
					/>
				</div>

				<div className={styles.resultsPanel} data-testid="test-results-panel">
					{renderResults()}
				</div>
			</div>

			{validationError && (
				<Callout
					type="error"
					size="small"
					showIcon
					title={validationError}
					testId="test-input-error"
					className={styles.validationCallout}
				/>
			)}
		</div>
	);
}

export default TestTab;
