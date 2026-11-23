import { useState } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Pill } from '@signozhq/ui/pill';
import { Typography } from '@signozhq/ui/typography';

import styles from './PatternEditor.module.scss';

interface PatternEditorProps {
	patterns: string[];
	isReadOnly: boolean;
	onChange: (patterns: string[]) => void;
}

// Model-name patterns as removable chips + an add input.
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
		<div className={styles.drawerSection}>
			<span className={styles.fieldLabel}>Model name patterns</span>
			<div className={styles.patternBox}>
				{patterns.length > 0 && (
					<div className={styles.patternChips}>
						{patterns.map((pattern) =>
							isReadOnly ? (
								<Badge
									textTransform="none"
									key={pattern}
									color="secondary"
									variant="outlined"
								>
									{pattern}
								</Badge>
							) : (
								<Pill.Closeable
									key={pattern}
									maxWidth={240}
									closeAriaLabel={`Remove pattern ${pattern}`}
									onClose={(): void => removePattern(pattern)}
								>
									{pattern}
								</Pill.Closeable>
							),
						)}
					</div>
				)}
				{!isReadOnly && (
					<div className={styles.patternAdd}>
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
							size="md"
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
			<Typography
				variant="paragraph"
				size="small"
				weight="regular"
				color="secondary"
				as="p"
				display="inline"
				textOverflow="wrap"
			>
				A pattern matches <code>gen_ai.request.model</code> exactly, plus its dated
				or platform variants such as <code>-20260921</code>, <code>-latest</code> or{' '}
				<code>@20260921</code>. End it with <code>*</code> to match any suffix.
			</Typography>
		</div>
	);
}

export default PatternEditor;
