import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from '@signozhq/icons';
import FieldsSelector from 'components/FieldsSelector';
import { StaticFieldsSource } from 'components/FieldsSelector/staticFields';
import Controls, { ControlsProps } from 'container/Controls';
import { OptionsMenuConfig } from 'container/OptionsMenu/types';
import useQueryPagination from 'hooks/queryPagination/useQueryPagination';
import { DataSource } from 'types/common/queryBuilder';

import styles from './Controls.module.scss';

function ExplorerControls({
	isLoading,
	totalCount,
	perPageOptions,
	config,
	addStaticFields,
	requiredFields,
}: ExplorerControlsProps): JSX.Element | null {
	const { t } = useTranslation(['trace']);
	const [isFieldsSelectorOpen, setIsFieldsSelectorOpen] = useState(false);

	const {
		pagination,
		handleCountItemsPerPageChange,
		handleNavigateNext,
		handleNavigatePrevious,
	} = useQueryPagination(totalCount, perPageOptions);

	return (
		<div className={styles.container}>
			{config?.fieldsSelector && (
				<>
					<div
						className={styles.optionsTrigger}
						onClick={(): void => setIsFieldsSelectorOpen(true)}
					>
						{t('options_menu.options')}
						<Settings size="md" />
					</div>
					<FieldsSelector
						isOpen={isFieldsSelectorOpen}
						title="Edit columns"
						fields={config.fieldsSelector.value}
						onFieldsChange={config.fieldsSelector.onFieldsChange}
						onClose={(): void => setIsFieldsSelectorOpen(false)}
						signal={DataSource.TRACES}
						addStaticFields={addStaticFields}
						requiredFields={requiredFields}
					/>
				</>
			)}

			<Controls
				isLoading={isLoading}
				totalCount={totalCount}
				offset={pagination.offset}
				countPerPage={pagination.limit}
				perPageOptions={perPageOptions}
				handleCountItemsPerPageChange={handleCountItemsPerPageChange}
				handleNavigateNext={handleNavigateNext}
				handleNavigatePrevious={handleNavigatePrevious}
			/>
		</div>
	);
}

type ExplorerControlsProps = Pick<
	ControlsProps,
	'isLoading' | 'totalCount' | 'perPageOptions'
> & {
	config?: OptionsMenuConfig | null;
	/** Named pool for the fields selector; omit to search the keys endpoint. */
	addStaticFields?: StaticFieldsSource;
	requiredFields?: readonly string[];
};

ExplorerControls.defaultProps = {
	config: null,
	addStaticFields: undefined,
	requiredFields: undefined,
};

export default memo(ExplorerControls);
