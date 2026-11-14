import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { InputNumber } from '@signozhq/ui/input-number';
import { toast } from '@signozhq/ui/sonner';
import { Typography } from '@signozhq/ui/typography';
import { apDexToolTipText, apDexToolTipUrl } from 'constants/apDex';
import { useSetApDexSettings } from 'hooks/apDex/useSetApDexSettings';

import styles from './ApdexSettings.module.scss';

interface ThresholdFieldProps {
	serviceName: string;
	savedThreshold: number;
	onSaved: () => void;
	onCancel: () => void;
}

function ThresholdField({
	serviceName,
	savedThreshold,
	onSaved,
	onCancel,
}: ThresholdFieldProps): JSX.Element {
	const [threshold, setThreshold] = useState(savedThreshold);
	const { mutateAsync, isLoading } = useSetApDexSettings({
		servicename: serviceName,
		threshold,
		excludeStatusCode: '',
	});

	const save = async (): Promise<void> => {
		try {
			await mutateAsync({
				servicename: serviceName,
				threshold,
				excludeStatusCode: '',
			});
			onSaved();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Could not save the threshold.',
			);
		}
	};

	return (
		<div className={styles.form}>
			<Typography.Text weight="medium">Apdex threshold (seconds)</Typography.Text>
			<Typography.Text size="small" color="muted">
				{apDexToolTipText}{' '}
				<a href={apDexToolTipUrl} target="_blank" rel="noreferrer">
					Learn more
				</a>
			</Typography.Text>
			<InputNumber
				value={threshold}
				min={0}
				step={0.1}
				onChange={(value): void => setThreshold(value ?? 0)}
				testId="service-apdex-threshold"
			/>
			<div className={styles.actions}>
				<Button
					variant="ghost"
					size="sm"
					color="secondary"
					onClick={onCancel}
					testId="service-apdex-cancel"
				>
					Cancel
				</Button>
				<Button
					variant="solid"
					size="sm"
					color="primary"
					loading={isLoading}
					onClick={(): void => void save()}
					testId="service-apdex-save"
				>
					Save
				</Button>
			</div>
		</div>
	);
}

export default ThresholdField;
