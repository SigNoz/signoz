import { Wand } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Checkbox } from '@signozhq/ui/checkbox';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';

import {
	ANY_RESOURCE_VALUE,
	QUERY_TYPES,
	SUPPORTED_GRANT_KEY,
} from './TelemetrySelectorWizard.constants';
import { isQueryTypeAvailable } from './TelemetrySelectorWizard.utils';
import useTelemetrySelectorWizard from './useTelemetrySelectorWizard';

import styles from './TelemetrySelectorWizard.module.scss';
import { AuthZResource } from 'lib/authz/hooks/useAuthZ/types';

interface TelemetrySelectorWizardProps {
	onAdd: (selector: string) => void;
	resource: AuthZResource;
	testId: string;
}

function TelemetrySelectorWizard({
	onAdd,
	resource,
	testId,
}: TelemetrySelectorWizardProps): JSX.Element {
	const {
		open,
		queryType,
		selectedQueryType,
		value,
		selector,
		isAnyResource,
		supportsKeyScoping,
		validation,
		canAdd,
		handleOpenChange,
		handleQueryTypeChange,
		handleValueChange,
		handleAnyResourceChange,
		handleSelectorChange,
		handleAdd,
		handleInputKeyDown,
	} = useTelemetrySelectorWizard({ onAdd });

	const trigger = (
		<Button
			variant="solid"
			size="sm"
			data-testid={`telemetry-wizard-trigger-${testId}`}
		>
			<Wand size={14} />
			Wizard
		</Button>
	);

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
			title="Selector Wizard"
			width="wide"
			testId={`telemetry-wizard-dialog-${testId}`}
			trigger={trigger}
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
							{QUERY_TYPES.filter((queryTypeOption) =>
								isQueryTypeAvailable(queryTypeOption, resource),
							).map((queryTypeOption) => (
								<SelectItem
									key={queryTypeOption.id}
									value={queryTypeOption.id}
									testId={`wizard-query-type-option-${queryTypeOption.id}-${testId}`}
								>
									{queryTypeOption.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{supportsKeyScoping && (
					<div className={styles.wizardField}>
						<Typography as="label" weight="medium">
							Key
						</Typography>
						<Input
							value={SUPPORTED_GRANT_KEY}
							readOnly
							disabled
							testId={`wizard-key-input-${testId}`}
						/>
					</div>
				)}

				<div className={styles.wizardField}>
					<Typography as="label" weight="medium">
						Value
					</Typography>
					<div className={styles.wizardValueRow}>
						<Input
							className={styles.wizardValueInput}
							placeholder={
								supportsKeyScoping
									? 'Value or leave empty to allow every query'
									: ANY_RESOURCE_VALUE
							}
							value={value}
							disabled={!supportsKeyScoping}
							onChange={handleValueChange}
							onKeyDown={handleInputKeyDown}
							testId={`wizard-value-input-${testId}`}
						/>
						<Checkbox
							id={`wizard-any-resource-${testId}`}
							value={isAnyResource}
							disabled={!supportsKeyScoping}
							onChange={(checked): void => handleAnyResourceChange(checked === true)}
							testId={`wizard-any-resource-checkbox-${testId}`}
						>
							Any value
						</Checkbox>
					</div>
				</div>

				<div className={styles.wizardField}>
					<Typography as="label" weight="medium">
						Selector
					</Typography>
					<Input
						value={selector}
						onChange={handleSelectorChange}
						onKeyDown={handleInputKeyDown}
						testId={`wizard-selector-input-${testId}`}
					/>
					<Typography.Text
						size="small"
						color={validation.isError ? 'danger' : 'muted'}
						testId={`wizard-selector-hint-${testId}`}
					>
						{validation.message}
					</Typography.Text>
				</div>
			</div>
		</DialogWrapper>
	);
}

export default TelemetrySelectorWizard;
