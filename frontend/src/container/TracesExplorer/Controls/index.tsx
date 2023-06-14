import Controls, { ControlsProps } from 'container/Controls';
import OptionsMenu from 'container/OptionsMenu';
import useQueryPagination from 'hooks/queryPagination/useQueryPagination';
import { memo } from 'react';

import { Container } from './styles';

function TraceExplorerControls({
	isLoading,
	totalCount,
}: TraceExplorerControlsProps): JSX.Element | null {
	const {
		pagination,
		handleCountItemsPerPageChange,
		handleNavigateNext,
		handleNavigatePrevious,
	} = useQueryPagination(totalCount);

	return (
		<Container>
			<OptionsMenu
				config={{ format: { value: 'column', onChange: (): void => {} } }}
			/>
			<Controls
				isLoading={isLoading}
				totalCount={totalCount}
				offset={pagination.offset}
				countPerPage={pagination.limit}
				handleCountItemsPerPageChange={handleCountItemsPerPageChange}
				handleNavigateNext={handleNavigateNext}
				handleNavigatePrevious={handleNavigatePrevious}
			/>
		</Container>
	);
}

type TraceExplorerControlsProps = Pick<
	ControlsProps,
	'isLoading' | 'totalCount'
>;

export default memo(TraceExplorerControls);
