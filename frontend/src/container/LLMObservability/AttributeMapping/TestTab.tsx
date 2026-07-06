import { Play } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import Editor from 'components/Editor';

import styles from './TestTab.module.scss';
import TestResult from './TestResult';
import { AttributeMappingStore } from './AttributeMappingsTab/hooks/useAttributeMappingStore';
import { useTestSpanMapper } from './useTestSpanMapper';

interface TestTabProps {
	store: AttributeMappingStore;
}

// "Test" tab: paste a sample span, run it through the working draft's mappers,
// and see which target attributes get populated. Only groups whose mappers
// changed are sent in full — unchanged groups are backfilled server-side.
function TestTab({ store }: TestTabProps): JSX.Element {
	const { input, setInput, run, isRunning, result, testedAttributes, error } =
		useTestSpanMapper(store.snapshot, store.groups);

	return (
		<div className={styles.testTab} data-testid="test-tab">
			<h3 className={styles.heading}>Test with sample span</h3>
			<p className={styles.description}>
				Paste a JSON span object to see which target attributes get populated and
				which source key matched.
			</p>

			<div
				className={styles.editor}
				data-testid="test-span-input"
				aria-label="Sample span JSON"
			>
				<Editor
					language="json"
					value={input}
					onChange={setInput}
					height="100%"
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

			<div className={styles.actions}>
				<Button
					testId="run-test-button"
					variant="solid"
					color="primary"
					prefix={<Play size={14} />}
					onClick={run}
					loading={isRunning}
					disabled={isRunning}
				>
					Run Test
				</Button>
			</div>

			{error && (
				<div className={styles.error} role="alert" data-testid="test-error">
					{error}
				</div>
			)}

			{result && (
				<div className={styles.results} data-testid="test-results">
					{result.length === 0 ? (
						<div className={styles.resultEmpty}>
							No spans returned. The mappers produced no output for this input.
						</div>
					) : (
						result.map((span, index) => (
							<TestResult
								// eslint-disable-next-line react/no-array-index-key
								key={index}
								index={index}
								span={span}
								inputAttributes={testedAttributes ?? {}}
							/>
						))
					)}
				</div>
			)}
		</div>
	);
}

export default TestTab;
