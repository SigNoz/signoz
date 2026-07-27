import { useCallback, useMemo, useState } from 'react';
import { Wand } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';
import {
	RadioGroup,
	RadioGroupItem,
	RadioGroupLabel,
} from '@signozhq/ui/radio-group';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@signozhq/ui/select';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';

import {
	QUERY_TYPES,
	QueryTypeId,
	ScopeMode,
} from './TelemetrySelectorWizard.types';
import styles from './TelemetrySelectorWizard.module.scss';

interface TelemetrySelectorWizardProps {
	onAdd: (selector: string) => void;
	testId: string;
}

function TelemetrySelectorWizard({
	onAdd,
	testId,
}: TelemetrySelectorWizardProps): JSX.Element {
	const [open, setOpen] = useState(false);
	const [scopeMode, setScopeMode] = useState<ScopeMode>('all');
	const [queryType, setQueryType] = useState<QueryTypeId>('builder_query');
	const [keyValue, setKeyValue] = useState('');

	const selectedQueryType = useMemo(
		() => QUERY_TYPES.find((qt) => qt.id === queryType),
		[queryType],
	);

	const canAdd = useMemo(() => {
		if (scopeMode === 'all') {
			return true;
		}
		return keyValue.trim().length > 0;
	}, [scopeMode, keyValue]);

	const handleScopeModeChange = useCallback((value: string): void => {
		setScopeMode(value as ScopeMode);
		if (value === 'all') {
			setKeyValue('');
		}
	}, []);

	const handleQueryTypeChange = useCallback((value: string | string[]): void => {
		const selected = Array.isArray(value) ? value[0] : value;
		setQueryType(selected as QueryTypeId);
		if (!QUERY_TYPES.find((qt) => qt.id === selected)?.supportsKeyScoping) {
			setScopeMode('all');
			setKeyValue('');
		}
	}, []);

	const handleKeyValueChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			setKeyValue(e.target.value);
		},
		[],
	);

	const handleAdd = useCallback((): void => {
		let selector: string;

		if (scopeMode === 'all') {
			selector = `${queryType}/*`;
		} else {
			selector = `${queryType}/${keyValue.trim()}`;
		}

		onAdd(selector);
		setKeyValue('');
		setOpen(false);
	}, [scopeMode, queryType, keyValue, onAdd]);

	const handleOpenChange = useCallback((nextOpen: boolean): void => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setScopeMode('all');
			setQueryType('builder_query');
			setKeyValue('');
		}
	}, []);

	const supportsKeyScoping = selectedQueryType?.supportsKeyScoping ?? false;

	const valueHint = useMemo(() => {
		if (scopeMode === 'byKey') {
			return 'Eg: signoz.workspace.key.id/123';
		}
		if (supportsKeyScoping) {
			return "Scope is set to All, so this grant covers every query of this type. Switch to 'By key' to restrict it to one key.";
		}
		return `${
			selectedQueryType?.label ?? 'This query type'
		} cannot be key-scoped, so this grant always covers every query of this type.`;
	}, [scopeMode, supportsKeyScoping, selectedQueryType]);

	const footer = (
		<>
			<Button
				variant="ghost"
				color="secondary"
				onClick={(): void => handleOpenChange(false)}
			>
				Cancel
			</Button>
			<Button
				variant="solid"
				onClick={handleAdd}
				disabled={!canAdd}
				data-testid={`wizard-add-btn-${testId}`}
			>
				Add Selector
			</Button>
		</>
	);

	return (
		<DialogWrapper
			open={open}
			onOpenChange={handleOpenChange}
			title="Add Telemetry Selector"
			width="narrow"
			testId={`telemetry-wizard-dialog-${testId}`}
			trigger={
				<Button
					variant="solid"
					size="sm"
					data-testid={`telemetry-wizard-trigger-${testId}`}
				>
					<Wand size={14} />
					Wizard
				</Button>
			}
			footer={footer}
			className={styles.wizardDialog}
		>
			<div className={styles.wizardBody}>
				<div className={styles.wizardField}>
					<Typography as="label" weight="medium">
						Query Type
					</Typography>
					<Select value={queryType} onChange={handleQueryTypeChange}>
						<SelectTrigger data-testid={`wizard-query-type-select-${testId}`}>
							<SelectValue>{selectedQueryType?.label}</SelectValue>
						</SelectTrigger>
						<SelectContent withPortal={false} className={styles.selectContent}>
							{QUERY_TYPES.map((qt) => (
								<SelectItem key={qt.id} value={qt.id}>
									<div className={styles.selectItemContent}>
										<span>{qt.label}</span>
										<Typography size="small">{qt.description}</Typography>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{selectedQueryType && (
						<Typography size="small" className={styles.queryTypeHint}>
							{selectedQueryType.description}
						</Typography>
					)}
				</div>

				<div className={styles.wizardField}>
					<Typography as="label" weight="medium">
						Scope
					</Typography>
					<RadioGroup
						value={scopeMode}
						onChange={handleScopeModeChange}
						className={styles.wizardRadioGroup}
						data-testid={`wizard-scope-radio-${testId}`}
					>
						<div className={styles.wizardRadioItem}>
							<RadioGroupItem value="all" id="scope-all" />
							<RadioGroupLabel htmlFor="scope-all">All (*)</RadioGroupLabel>
						</div>
						{supportsKeyScoping ? (
							<div className={styles.wizardRadioItem}>
								<RadioGroupItem value="byKey" id="scope-by-key" />
								<RadioGroupLabel htmlFor="scope-by-key">By key</RadioGroupLabel>
							</div>
						) : (
							<TooltipSimple
								title="This query type does not support key scoping"
								withPortal={false}
								side="left"
								arrow
							>
								<div className={styles.wizardRadioItem}>
									<RadioGroupItem value="byKey" id="scope-by-key" disabled />
									<RadioGroupLabel htmlFor="scope-by-key" data-disabled>
										By key
									</RadioGroupLabel>
								</div>
							</TooltipSimple>
						)}
					</RadioGroup>
				</div>

				<div className={styles.wizardField}>
					<Typography as="label" weight="medium">
						Value
					</Typography>
					{scopeMode === 'all' ? (
						<Input value="*" disabled data-testid={`wizard-value-input-${testId}`} />
					) : (
						<Input
							placeholder="Enter <key>/<value>"
							value={keyValue}
							onChange={handleKeyValueChange}
							onKeyDown={(e): void => {
								if (e.key === 'Enter' && canAdd) {
									handleAdd();
								}
							}}
							data-testid={`wizard-value-input-${testId}`}
						/>
					)}
					<Typography.Text
						size="small"
						color="muted"
						testId={`wizard-value-hint-${testId}`}
					>
						{valueHint}
					</Typography.Text>
				</div>
			</div>
		</DialogWrapper>
	);
}

export default TelemetrySelectorWizard;
