import { useMemo, useState } from 'react';
import { Button, Drawer, Input, InputNumber, Select, Tooltip } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';
import { Lock, Trash2, X } from '@signozhq/icons';
import { LlmpricingruletypesLLMPricingRuleCacheModeDTO as CacheModeDTO } from 'api/generated/services/sigNoz.schemas';

import {
	CACHE_MODE_OPTIONS,
	computeCostPreview,
	matchesAnyPattern,
	PROVIDER_OPTIONS,
	validateDraft,
	type DrawerDraft,
	type DrawerMode,
} from './drawerUtils';
import './ModelCostDrawer.styles.scss';

interface ModelCostDrawerProps {
	isOpen: boolean;
	mode: DrawerMode;
	draft: DrawerDraft;
	setDraft: (next: DrawerDraft) => void;
	onClose: () => void;
	onSave: () => void;
	onDelete: () => void;
	isSaving: boolean;
	isDeleting: boolean;
	saveError: string | null;
}

function ModelCostDrawer({
	isOpen,
	mode,
	draft,
	setDraft,
	onClose,
	onSave,
	onDelete,
	isSaving,
	isDeleting,
	saveError,
}: ModelCostDrawerProps): JSX.Element {
	const [patternInput, setPatternInput] = useState<string>('');
	const [testInput, setTestInput] = useState<string>('');
	const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
	const isReadOnly = !draft.isOverride;

	const validation = validateDraft(draft, mode);
	const preview = useMemo(() => computeCostPreview(draft), [draft]);
	const testMatch = useMemo(
		() => (testInput ? matchesAnyPattern(testInput, draft.patterns) : null),
		[testInput, draft.patterns],
	);

	const update = (patch: Partial<DrawerDraft>): void => {
		setDraft({ ...draft, ...patch });
	};

	const updatePricing = (patch: Partial<DrawerDraft['pricing']>): void => {
		setDraft({ ...draft, pricing: { ...draft.pricing, ...patch } });
	};

	const addPattern = (): void => {
		const next = patternInput.trim();
		if (!next || draft.patterns.includes(next)) {
			setPatternInput('');
			return;
		}
		update({ patterns: [...draft.patterns, next] });
		setPatternInput('');
	};

	const removePattern = (pattern: string): void => {
		update({ patterns: draft.patterns.filter((p) => p !== pattern) });
	};

	const handleSourceChange = (value: 'auto' | 'override'): void => {
		if (value === 'auto' && draft.isOverride) {
			setShowResetConfirm(true);
			return;
		}
		if (value === 'override' && !draft.isOverride) {
			update({ isOverride: true });
		}
	};

	const confirmReset = (): void => {
		update({ isOverride: false });
		setShowResetConfirm(false);
	};

	const hasCacheBucket =
		draft.pricing.cacheRead !== null || draft.pricing.cacheWrite !== null;

	return (
		<Drawer
			width={520}
			open={isOpen}
			onClose={onClose}
			placement="right"
			className="model-cost-drawer"
			destroyOnClose
			closeIcon={<X size={16} />}
			title={
				<div className="model-cost-drawer__title">
					<h3>{mode === 'edit' ? 'Edit model cost' : 'Add model cost'}</h3>
					<p>Pricing computes gen_ai.estimated_total_cost at ingest.</p>
				</div>
			}
			footer={
				<div className="model-cost-drawer__footer">
					{mode === 'edit' && (
						<Button
							danger
							type="text"
							icon={<Trash2 size={14} />}
							onClick={onDelete}
							loading={isDeleting}
							data-testid="drawer-delete-btn"
						>
							Delete
						</Button>
					)}
					<div className="model-cost-drawer__footer-right">
						<Button onClick={onClose} data-testid="drawer-cancel-btn">
							Cancel
						</Button>
						<Tooltip title={validation.ok ? '' : validation.message}>
							<Button
								type="primary"
								onClick={onSave}
								loading={isSaving}
								disabled={!validation.ok}
								data-testid="drawer-save-btn"
							>
								Save
							</Button>
						</Tooltip>
					</div>
				</div>
			}
		>
			<div className="drawer-section">
				<label htmlFor="billing-model-id">Billing model ID</label>
				<Input
					id="billing-model-id"
					placeholder="e.g. openai:gpt-4o"
					value={draft.modelName}
					disabled={mode === 'edit'}
					onChange={(e): void => update({ modelName: e.target.value })}
					data-testid="drawer-model-id-input"
				/>
			</div>

			<div className="drawer-section">
				<label htmlFor="provider-select">Provider</label>
				<Select
					id="provider-select"
					value={draft.provider}
					onChange={(value): void => update({ provider: value })}
					options={PROVIDER_OPTIONS}
					disabled={mode === 'edit' || isReadOnly}
					className="full-width"
					data-testid="drawer-provider-select"
				/>
			</div>

			<div className="drawer-section">
				<span className="field-label">
					Model name patterns <span className="muted">(prefix match)</span>
				</span>
				<div className="pattern-chips">
					{draft.patterns.map((pattern) => (
						<Badge
							key={pattern}
							color="forest"
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
							onPressEnter={addPattern}
							data-testid="drawer-pattern-input"
						/>
						<Button onClick={addPattern} data-testid="drawer-pattern-add-btn">
							+ Add
						</Button>
					</div>
				)}
				<p className="muted help">
					Each pattern uses prefix matching against gen_ai.request.model.
				</p>
				{!isReadOnly && (
					<div className="pattern-test">
						<Input
							placeholder="Test: type a model name…"
							value={testInput}
							onChange={(e): void => setTestInput(e.target.value)}
							data-testid="drawer-pattern-test-input"
						/>
						{testInput && (
							<span
								className={`pattern-test__result ${
									testMatch
										? 'pattern-test__result--match'
										: 'pattern-test__result--no-match'
								}`}
								data-testid="drawer-pattern-test-result"
							>
								{testMatch ? `Matched: ${testMatch}*` : 'No matching pattern'}
							</span>
						)}
					</div>
				)}
			</div>

			<div className="drawer-section drawer-surface">
				<div className="drawer-surface__head">
					<h4>Source</h4>
					{isReadOnly && (
						<span className="managed-label">
							<Lock size={12} />
							Managed by SigNoz
						</span>
					)}
				</div>
				<RadioGroup
					value={draft.isOverride ? 'override' : 'auto'}
					onChange={(value): void =>
						handleSourceChange(value as 'auto' | 'override')
					}
					className="source-radio-group"
				>
					<RadioGroupItem
						value="auto"
						className="source-radio source-radio--auto"
						testId="drawer-source-auto"
					>
						<div className="source-radio__title">Auto-populated</div>
						<div className="source-radio__desc">
							Default pricing from SigNoz. Updated automatically.
						</div>
					</RadioGroupItem>
					<RadioGroupItem
						value="override"
						className="source-radio source-radio--override"
						testId="drawer-source-override"
					>
						<div className="source-radio__title">User override</div>
						<div className="source-radio__desc">
							Custom pricing. Takes precedence.
						</div>
					</RadioGroupItem>
				</RadioGroup>
				{showResetConfirm && (
					<div
						className="reset-confirm"
						role="dialog"
						aria-label="Reset to default pricing"
					>
						<p>Reset to default pricing? Custom values will be discarded.</p>
						<div className="reset-confirm__actions">
							<Button
								onClick={(): void => setShowResetConfirm(false)}
								data-testid="drawer-reset-keep-btn"
							>
								Keep
							</Button>
							<Button
								type="primary"
								onClick={confirmReset}
								data-testid="drawer-reset-confirm-btn"
							>
								Reset
							</Button>
						</div>
					</div>
				)}
			</div>

			<div className="drawer-section drawer-surface">
				<div className="drawer-surface__head">
					<h4>Pricing (per 1M tokens, USD)</h4>
					{isReadOnly && (
						<span className="managed-label">
							<Lock size={12} />
							Read-only
						</span>
					)}
				</div>
				<div className="pricing-grid">
					<div className="pricing-field">
						<label htmlFor="input-cost">
							Input cost <span className="required">*</span>
						</label>
						<InputNumber
							id="input-cost"
							min={0}
							step={0.01}
							value={draft.pricing.input}
							onChange={(v): void => updatePricing({ input: Number(v) || 0 })}
							disabled={isReadOnly}
							data-testid="drawer-input-cost"
						/>
					</div>
					<div className="pricing-field">
						<label htmlFor="output-cost">
							Output cost <span className="required">*</span>
						</label>
						<InputNumber
							id="output-cost"
							min={0}
							step={0.01}
							value={draft.pricing.output}
							onChange={(v): void => updatePricing({ output: Number(v) || 0 })}
							disabled={isReadOnly}
							data-testid="drawer-output-cost"
						/>
					</div>
				</div>

				<div className="extras-divider">Extra pricing buckets</div>
				<div className="pricing-grid">
					<div className="pricing-field">
						<label htmlFor="cache-read">cache_read</label>
						<InputNumber
							id="cache-read"
							min={0}
							step={0.01}
							value={draft.pricing.cacheRead ?? undefined}
							placeholder="—"
							onChange={(v): void =>
								updatePricing({ cacheRead: v === null ? null : Number(v) })
							}
							disabled={isReadOnly}
							data-testid="drawer-cache-read-cost"
						/>
					</div>
					<div className="pricing-field">
						<label htmlFor="cache-write">cache_write</label>
						<InputNumber
							id="cache-write"
							min={0}
							step={0.01}
							value={draft.pricing.cacheWrite ?? undefined}
							placeholder="—"
							onChange={(v): void =>
								updatePricing({ cacheWrite: v === null ? null : Number(v) })
							}
							disabled={isReadOnly}
							data-testid="drawer-cache-write-cost"
						/>
					</div>
				</div>
				{hasCacheBucket && (
					<div className="pricing-field cache-mode-field">
						<label htmlFor="cache-mode">Cache mode</label>
						<Select
							id="cache-mode"
							value={draft.pricing.cacheMode}
							options={CACHE_MODE_OPTIONS}
							onChange={(v): void => updatePricing({ cacheMode: v as CacheModeDTO })}
							disabled={isReadOnly}
							className="full-width"
							data-testid="drawer-cache-mode"
						/>
					</div>
				)}
				<p className="muted help">Image tokens may be priced differently (v2).</p>
			</div>

			<div className="drawer-section drawer-surface cost-preview">
				<div className="drawer-surface__head">
					<h4>Cost preview</h4>
				</div>
				<div className="cost-preview__line">
					{preview.breakdown.map((part) => part.label).join(' + ')} ={' '}
					<strong>≈ ${preview.total.toFixed(4)}</strong>
				</div>
				<p className="muted help">
					Write-time attribution. Changes only affect new spans.
				</p>
			</div>

			{saveError && (
				<div className="drawer-error" role="alert">
					{saveError}
				</div>
			)}
		</Drawer>
	);
}

export default ModelCostDrawer;
