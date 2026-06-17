import { useState } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { X } from '@signozhq/icons';

interface PatternEditorProps {
	patterns: string[];
	isReadOnly: boolean;
	onChange: (patterns: string[]) => void;
}

// Model-name prefix patterns as removable chips + an add input.
function PatternEditor({
	patterns,
	isReadOnly,
	onChange,
}: PatternEditorProps): JSX.Element {
	const [patternInput, setPatternInput] = useState<string>('');

	const addPattern = (): void => {
		const next = patternInput.trim();
		if (!next || patterns.includes(next)) {
			setPatternInput('');
			return;
		}
		onChange([...patterns, next]);
		setPatternInput('');
	};

	const removePattern = (pattern: string): void => {
		onChange(patterns.filter((p) => p !== pattern));
	};

	return (
		<div className="drawer-section">
			<span className="field-label">
				Model name patterns <span className="muted">(prefix match)</span>
			</span>
			<div className="pattern-box">
				<div className="pattern-chips">
					{patterns.map((pattern) => (
						<Badge
							key={pattern}
							color="vanilla"
							variant="outline"
							className="pattern-chip"
						>
							{pattern}*
							{!isReadOnly && (
								<button
									type="button"
									aria-label={`Remove pattern ${pattern}`}
									className="pattern-chip__remove"
									onClick={(): void => removePattern(pattern)}
								>
									<X size={10} />
								</button>
							)}
						</Badge>
					))}
				</div>
				{!isReadOnly && (
					<div className="pattern-add">
						<Input
							placeholder="Add pattern…"
							value={patternInput}
							onChange={(e): void => setPatternInput(e.target.value)}
							onKeyDown={(e): void => {
								if (e.key === 'Enter') {
									e.preventDefault();
									addPattern();
								}
							}}
							testId="drawer-pattern-input"
						/>
						<Button
							variant="outlined"
							color="secondary"
							onClick={addPattern}
							testId="drawer-pattern-add-btn"
						>
							+ Add
						</Button>
					</div>
				)}
			</div>
			<p className="muted help">
				Each pattern uses <strong>prefix matching</strong> against{' '}
				<code>gen_ai.request.model</code>.
			</p>
		</div>
	);
}

export default PatternEditor;
