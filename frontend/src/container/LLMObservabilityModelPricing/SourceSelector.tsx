import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';
import { Lock } from '@signozhq/icons';

interface SourceSelectorProps {
	isOverride: boolean;
	isReadOnly: boolean;
	disableAuto?: boolean;
	onChange: (isOverride: boolean) => void;
}

// Auto-populated vs user-override selector, with a confirm step before
// discarding custom values back to defaults.
function SourceSelector({
	isOverride,
	isReadOnly,
	disableAuto = false,
	onChange,
}: SourceSelectorProps): JSX.Element {
	const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

	const handleSourceChange = (value: 'auto' | 'override'): void => {
		if (value === 'auto' && isOverride) {
			setShowResetConfirm(true);
			return;
		}
		if (value === 'override' && !isOverride) {
			onChange(true);
		}
	};

	const confirmReset = (): void => {
		onChange(false);
		setShowResetConfirm(false);
	};

	return (
		<div className="drawer-section drawer-surface">
			<div className="drawer-surface__head">
				<h4>Source</h4>
				{isReadOnly && (
					<span className="managed-label" data-testid="drawer-managed-label">
						<Lock size={12} />
						Managed by SigNoz
					</span>
				)}
			</div>
			<RadioGroup
				value={isOverride ? 'override' : 'auto'}
				onChange={(value): void => handleSourceChange(value as 'auto' | 'override')}
				className="source-radio-group"
			>
				<RadioGroupItem
					value="auto"
					containerClassName="source-radio source-radio--auto"
					testId="drawer-source-auto"
					disabled={disableAuto}
				>
					<div className="source-radio__title">Auto-populated</div>
					<div className="source-radio__desc">
						{disableAuto
							? 'Available once SigNoz has default pricing for this model.'
							: 'Default pricing from SigNoz.'}
					</div>
				</RadioGroupItem>
				<RadioGroupItem
					value="override"
					containerClassName="source-radio source-radio--override"
					testId="drawer-source-override"
				>
					<div className="source-radio__title">User override</div>
					<div className="source-radio__desc">Custom pricing. Takes precedence.</div>
				</RadioGroupItem>
			</RadioGroup>
			{showResetConfirm && (
				<div
					className="reset-confirm"
					role="dialog"
					aria-label="Reset to default pricing"
				>
					<p>
						Reset to default pricing? Custom values will be discarded. It might take
						24 hours for changes to take effect.
					</p>
					<div className="reset-confirm__actions">
						<Button
							variant="outlined"
							color="secondary"
							onClick={(): void => setShowResetConfirm(false)}
							testId="drawer-reset-keep-btn"
						>
							Keep
						</Button>
						<Button
							variant="solid"
							color="primary"
							onClick={confirmReset}
							testId="drawer-reset-confirm-btn"
						>
							Reset
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

export default SourceSelector;
