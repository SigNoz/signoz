import { useState } from 'react';
import { Settings } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@signozhq/ui/popover';

import ApdexSettingsForm from './ApdexSettingsForm';

import styles from './ApdexSettings.module.scss';

interface ApdexSettingsProps {
	serviceName: string;
}

function ApdexSettings({ serviceName }: ApdexSettingsProps): JSX.Element {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outlined"
					color="secondary"
					size="md"
					prefix={<Settings size="md" />}
					testId="service-apdex-settings-trigger"
				>
					Settings
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className={styles.content}>
				<ApdexSettingsForm
					serviceName={serviceName}
					onDone={(): void => setIsOpen(false)}
				/>
			</PopoverContent>
		</Popover>
	);
}

export default ApdexSettings;
