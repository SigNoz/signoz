import Controls, { ControlsProps } from 'container/Controls';
import OptionsMenu from 'container/OptionsMenu';
import { OptionsMenuConfig } from 'container/OptionsMenu/types';
import useQueryPagination from 'hooks/queryPagination/useQueryPagination';
import { memo } from 'react';

import { Container } from './styles';

function TraceExplorerControls({
	isLoading,
	totalCount,
	perPageOptions,
	config,
}: TraceExplorerControlsProps): JSX.Element | null {
	const {
		pagination,
		handleCountItemsPerPageChange,
		handleNavigateNext,
		handleNavigatePrevious,
	} = useQueryPagination(totalCount, perPageOptions);

	return (
		<Container>
			{config && <OptionsMenu config={{ addColumn: config?.addColumn }} />}

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
		</Container>
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
};

export default memo(TraceExplorerControls);
