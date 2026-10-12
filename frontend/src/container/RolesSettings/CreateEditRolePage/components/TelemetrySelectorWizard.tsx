import { Wand } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Checkbox } from '@signozhq/ui/checkbox';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';
import { Select } from '@signozhq/ui/select';
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
			color="primary"
			variant="solid"
			size="sm"
			testId={`telemetry-wizard-trigger-${testId}`}
			prefix={<Wand size={14} />}
		>
			Wizard
		</Button>
	);

	const footer = (
		<>
			<Button
				size="md"
				variant="ghost"
				color="secondary"
				onClick={(): void => handleOpenChange(false)}
			>
				Cancel
			</Button>
			<Button
				size="md"
				color="primary"
				variant="solid"
				onClick={handleAdd}
				disabled={!canAdd}
				disabledTooltip={validation.message}
				testId={`wizard-add-btn-${testId}`}
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
					<Select
						placeholder="Select a query type"
						value={queryType}
						onChange={handleQueryTypeChange}
						items={QUERY_TYPES.filter((queryTypeOption) =>
							isQueryTypeAvailable(queryTypeOption, resource),
						).map((queryTypeOption) => ({
							type: 'item' as const,
							value: queryTypeOption.id,
							label: queryTypeOption.label,
							testId: `wizard-query-type-option-${queryTypeOption.id}-${testId}`,
						}))}
						testId={`wizard-query-type-select-${testId}`}
					/>
				</div>

				{supportsKeyScoping && (
					<div className={styles.wizardField}>
						<Typography as="label" weight="medium">
							Key
						</Typography>
						<Input
							value={SUPPORTED_GRANT_KEY}
							readOnly
							readOnlyTooltip={undefined}
							testId={`wizard-key-input-${testId}`}
						/>
					</div>
				)}

				<div className={styles.wizardField}>
					<Typography as="label" weight="medium">
						Value
					</Typography>
					<div className={styles.wizardValueRow}>
						<div className={styles.wizardValueInput}>
							<Input
								placeholder={
									supportsKeyScoping
										? 'Value or leave empty to allow every query'
										: ANY_RESOURCE_VALUE
								}
								value={value}
								disabled={!supportsKeyScoping}
								disabledTooltip="This query type does not support key scoping"
								onChange={handleValueChange}
								onKeyDown={handleInputKeyDown}
								testId={`wizard-value-input-${testId}`}
							/>
						</div>
						<Checkbox
							color="primary"
							id={`wizard-any-resource-${testId}`}
							value={isAnyResource}
							disabled={!supportsKeyScoping}
							disabledTooltip="This query type does not support key scoping"
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
