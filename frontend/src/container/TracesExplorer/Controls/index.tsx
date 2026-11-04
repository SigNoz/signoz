import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersVertical } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import FieldsSelector from 'components/FieldsSelector';
import { OptionsMenuConfig } from 'container/OptionsMenu/types';
import { DataSource } from 'types/common/queryBuilder';

function TraceExplorerControls({
	config,
}: TraceExplorerControlsProps): JSX.Element | null {
	const { t } = useTranslation(['trace']);
	const [isFieldsSelectorOpen, setIsFieldsSelectorOpen] = useState(false);

	if (!config?.fieldsSelector) {
		return null;
	}

	const label = t('options_menu.options');

	return (
		<>
			<Tooltip title={label}>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					aria-label={label}
					testId="periscope-btn-options-traces"
					onClick={(): void => setIsFieldsSelectorOpen(true)}
				>
					<SlidersVertical size={14} />
				</Button>
			</Tooltip>
			<FieldsSelector
				isOpen={isFieldsSelectorOpen}
				title="Edit columns"
				fields={config.fieldsSelector.value}
				onFieldsChange={config.fieldsSelector.onFieldsChange}
				onClose={(): void => setIsFieldsSelectorOpen(false)}
				signal={DataSource.TRACES}
			/>
		</>
	);
}

type TraceExplorerControlsProps = {
	config?: OptionsMenuConfig | null;
};

TraceExplorerControls.defaultProps = {
	config: null,
};

export default memo(TraceExplorerControls);
