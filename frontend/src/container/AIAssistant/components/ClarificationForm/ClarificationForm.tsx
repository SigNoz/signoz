import { useState } from 'react';
import cx from 'classnames';
import { Button } from '@signozhq/ui/button';
import { Checkbox } from '@signozhq/ui/checkbox';
import { Input } from '@signozhq/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '@signozhq/ui/select';
import { ClarificationFieldTypeDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import type {
	ClarificationEventDTO,
	ClarificationFieldEventDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { CircleHelp, Send, X } from '@signozhq/icons';

import { useAIAssistantStore } from '../../store/useAIAssistantStore';

import styles from './ClarificationForm.module.scss';

/** Sentinel emitted by the select dropdown when the user picks the custom slot. */
const CUSTOM_OPTION_SENTINEL = '__signoz_ai_custom__';
/** User-facing label for the synthetic "type your own answer" option. */
const CUSTOM_OPTION_LABEL = 'Other (type your own)';

interface ClarificationFormProps {
	conversationId: string;
	clarification: ClarificationEventDTO;
}

/**
 * Rendered when the agent emits a `clarification` SSE event.
 * Dynamically renders form fields based on the `fields` array and
 * submits answers to resume the agent on a new execution.
 */
export default function ClarificationForm({
	conversationId,
	clarification,
}: ClarificationFormProps): JSX.Element {
	const submitClarification = useAIAssistantStore((s) => s.submitClarification);
	const cancelStream = useAIAssistantStore((s) => s.cancelStream);
	const isStreaming = useAIAssistantStore(
		(s) => s.streams[conversationId]?.isStreaming ?? false,
	);

	const fields = clarification.fields ?? [];
	const initialAnswers = Object.fromEntries(
		fields.map((f) => [f.id, initialAnswerFor(f)]),
	);
	const [answers, setAnswers] =
		useState<Record<string, unknown>>(initialAnswers);
	const [submitted, setSubmitted] = useState(false);
	const [cancelled, setCancelled] = useState(false);

	const setField = (id: string, value: unknown): void => {
		setAnswers((prev) => ({ ...prev, [id]: value }));
	};

	const handleSubmit = async (): Promise<void> => {
		setSubmitted(true);
		await submitClarification(
			conversationId,
			clarification.clarificationId,
			answers,
		);
	};

	const handleCancel = (): void => {
		setCancelled(true);
		cancelStream(conversationId);
	};

	if (submitted) {
		return (
			<div className={cx(styles.clarification, styles.submitted)}>
				<Send size={13} className={styles.icon} />
				<span className={styles.statusText}>Answers submitted — resuming…</span>
			</div>
		);
	}

	if (cancelled) {
		return (
			<div className={cx(styles.clarification, styles.submitted)}>
				<X size={13} className={styles.icon} />
				<span className={styles.statusText}>Request cancelled.</span>
			</div>
		);
	}

	return (
		<div className={styles.clarification}>
			<div className={styles.header}>
				<CircleHelp size={13} className={styles.headerIcon} />
				<span className={styles.headerLabel}>A few details needed</span>
			</div>

			<p className={styles.message}>{clarification.message}</p>

			<div className={styles.fields}>
				{fields.map((field) => (
					<FieldInput
						key={field.id}
						field={field}
						value={answers[field.id]}
						onChange={(val): void => setField(field.id, val)}
					/>
				))}
			</div>

			<div className={styles.actions}>
				<Button
					variant="solid"
					color="primary"
					onClick={handleSubmit}
					disabled={isStreaming}
					prefix={<Send />}
				>
					Submit
				</Button>
				<Button
					variant="outlined"
					color="secondary"
					onClick={handleCancel}
					disabled={isStreaming}
					prefix={<X />}
				>
					Cancel request
				</Button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Field renderer — covers every variant of ClarificationFieldTypeDTO:
// text, number, select, multi_select, boolean.
// ---------------------------------------------------------------------------

/**
 * Per-type seed value. The DTO's `default` is `string | string[] | null`,
 * which doesn't fit boolean fields cleanly — we coerce 'true'/'false' strings
 * for them, fall back to `[]` for multi_select, and the raw string otherwise.
 */
function initialAnswerFor(f: ClarificationFieldEventDTO): unknown {
	const raw = f.default;
	if (f.type === ClarificationFieldTypeDTO.boolean) {
		// `default` is typed string | string[] | null; backend sends
		// 'true'/'false' as strings for boolean fields.
		return raw === 'true';
	}
	if (f.type === ClarificationFieldTypeDTO.multi_select) {
		return Array.isArray(raw) ? raw : [];
	}
	return raw ?? '';
}

interface FieldInputProps {
	field: ClarificationFieldEventDTO;
	value: unknown;
	onChange: (value: unknown) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps): JSX.Element {
	const { id, type, label, required, options, allowCustom } = field;

	// Local UI state for the synthetic "custom" option on select /
	// multi_select fields with `allowCustom`. The free-text input only renders
	// when this is true; the typed value is what's actually sent up via
	// `onChange` (never the sentinel / "Other" label).
	const [isCustom, setIsCustom] = useState(false);
	const [customValue, setCustomValue] = useState('');

	// Render the select if the field has options OR if the server marked it
	// `allowCustom` (in which case the dropdown still appears with just the
	// "Other (type your own)" entry — a plain `options: null` would
	// otherwise fall through to the bare text-input renderer).
	if (type === ClarificationFieldTypeDTO.select && (options || allowCustom)) {
		const handleSelectChange = (next: string | string[]): void => {
			// `multiple` is off → callback receives a single string. The wider
			// `string | string[]` typing comes from the shared Select root.
			const picked = Array.isArray(next) ? (next[0] ?? '') : next;
			if (picked === CUSTOM_OPTION_SENTINEL) {
				setIsCustom(true);
				onChange(customValue);
			} else {
				setIsCustom(false);
				onChange(picked);
			}
		};

		return (
			<div className={styles.field}>
				<label className={styles.label} htmlFor={id}>
					{label}
					{required && <span className={styles.required}>*</span>}
				</label>
				<Select
					value={isCustom ? CUSTOM_OPTION_SENTINEL : String(value ?? '')}
					onChange={handleSelectChange}
				>
					<SelectTrigger id={id} placeholder="Select…" />
					{/* Pin the dropdown width to the trigger via Radix's
					    `--radix-select-trigger-width`; otherwise the popover
					    sizes to its widest item and looks misaligned. */}
					<SelectContent className={styles.selectContent}>
						{options?.map((opt) => (
							<SelectItem key={opt} value={opt}>
								{opt}
							</SelectItem>
						))}
						{allowCustom && (
							<SelectItem value={CUSTOM_OPTION_SENTINEL}>
								{CUSTOM_OPTION_LABEL}
							</SelectItem>
						)}
					</SelectContent>
				</Select>
				{isCustom && (
					<Input
						type="text"
						className={styles.input}
						placeholder="Enter a custom value"
						value={customValue}
						onChange={(e): void => {
							setCustomValue(e.target.value);
							onChange(e.target.value);
						}}
					/>
				)}
			</div>
		);
	}

	// Boolean — single yes/no checkbox. The label sits inside the checkbox
	// so the click target covers both, matching how multi_select rows render.
	if (type === ClarificationFieldTypeDTO.boolean) {
		const checked = value === true;
		return (
			<div className={styles.field}>
				<Checkbox
					className={styles.checkboxLabel}
					value={checked}
					onChange={(): void => onChange(!checked)}
				>
					{label}
					{required && <span className={styles.required}>*</span>}
				</Checkbox>
			</div>
		);
	}

	// Same fallback logic as the select branch — render the checkbox group
	// when there are options OR when the field is `allowCustom` only.
	if (
		type === ClarificationFieldTypeDTO.multi_select &&
		(options || allowCustom)
	) {
		const selected = Array.isArray(value) ? (value as string[]) : [];
		// Anything in the value array that isn't one of the predefined options
		// is treated as a custom entry — we keep at most one custom entry,
		// driven by the local `customValue` + `isCustom` state below.
		const regularSelected = selected.filter((v) => options?.includes(v));

		const toggleRegular = (opt: string): void => {
			const nextRegular = regularSelected.includes(opt)
				? regularSelected.filter((v) => v !== opt)
				: [...regularSelected, opt];
			onChange(
				isCustom && customValue ? [...nextRegular, customValue] : nextRegular,
			);
		};

		const toggleCustom = (): void => {
			if (isCustom) {
				setIsCustom(false);
				onChange(regularSelected);
			} else {
				setIsCustom(true);
				onChange(customValue ? [...regularSelected, customValue] : regularSelected);
			}
		};

		const updateCustomValue = (next: string): void => {
			setCustomValue(next);
			if (isCustom) {
				onChange(next ? [...regularSelected, next] : regularSelected);
			}
		};

		return (
			<div className={styles.field}>
				<span className={styles.label}>
					{label}
					{required && <span className={styles.required}>*</span>}
				</span>
				<div className={styles.checkboxGroup}>
					{options?.map((opt) => (
						<Checkbox
							key={opt}
							className={styles.checkboxLabel}
							value={regularSelected.includes(opt)}
							onChange={(): void => toggleRegular(opt)}
						>
							{opt}
						</Checkbox>
					))}
					{allowCustom && (
						<Checkbox
							className={styles.checkboxLabel}
							value={isCustom}
							onChange={toggleCustom}
						>
							{CUSTOM_OPTION_LABEL}
						</Checkbox>
					)}
				</div>
				{isCustom && (
					<Input
						type="text"
						className={styles.input}
						placeholder="Enter a custom value"
						value={customValue}
						onChange={(e): void => updateCustomValue(e.target.value)}
					/>
				)}
			</div>
		);
	}

	// text / number (default)
	return (
		<div className={styles.field}>
			<label className={styles.label} htmlFor={id}>
				{label}
				{required && <span className={styles.required}>*</span>}
			</label>
			<Input
				id={id}
				type={type === 'number' ? 'number' : 'text'}
				className={styles.input}
				value={String(value ?? '')}
				onChange={(e): void =>
					onChange(type === 'number' ? Number(e.target.value) : e.target.value)
				}
				placeholder={label}
			/>
		</div>
	);
}
