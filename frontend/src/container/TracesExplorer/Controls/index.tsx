import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from '@signozhq/icons';
import FieldsSelector from 'components/FieldsSelector';
import Controls, { ControlsProps } from 'container/Controls';
import { OptionsMenuConfig } from 'container/OptionsMenu/types';
import useQueryPagination from 'hooks/queryPagination/useQueryPagination';
import { DataSource } from 'types/common/queryBuilder';

import styles from './Controls.module.scss';

function TraceExplorerControls({
	isLoading,
	totalCount,
	perPageOptions,
	config,
	showSizeChanger = true,
}: TraceExplorerControlsProps): JSX.Element | null {
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
				showSizeChanger={showSizeChanger}
			/>
		</div>
	);
}

TraceExplorerControls.defaultProps = {
	config: null,
};

type TraceExplorerControlsProps = Pick<
	ControlsProps,
	'isLoading' | 'totalCount' | 'perPageOptions'
> & {
	config?: OptionsMenuConfig | null;
	showSizeChanger?: boolean;
};

TraceExplorerControls.defaultProps = {
	showSizeChanger: true,
};

export default memo(TraceExplorerControls);
