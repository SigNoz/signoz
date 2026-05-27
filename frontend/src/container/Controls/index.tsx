import { memo, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from '@signozhq/icons';
import { SelectSimple } from '@signozhq/ui/select';
import { Button, Flex } from 'antd';
import { DEFAULT_PER_PAGE_OPTIONS, Pagination } from 'hooks/queryPagination';

import { defaultSelectStyle } from './config';
import { Container } from './styles';

function Controls({
	offset = 0,
	perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
	isLoading,
	totalCount,
	countPerPage,
	handleNavigatePrevious,
	handleNavigateNext,
	handleCountItemsPerPageChange,
	isLogPanel = false,
	showSizeChanger = true,
}: ControlsProps): JSX.Element | null {
	const isNextAndPreviousDisabled = useMemo(
		() => isLoading || countPerPage < 0 || totalCount === 0,
		[isLoading, countPerPage, totalCount],
	);
	const isPreviousDisabled = useMemo(
		() => (isLogPanel ? false : offset <= 0 || isNextAndPreviousDisabled),
		[isLogPanel, isNextAndPreviousDisabled, offset],
	);
	const isNextDisabled = useMemo(
		() =>
			isLogPanel ? false : totalCount < countPerPage || isNextAndPreviousDisabled,
		[countPerPage, isLogPanel, isNextAndPreviousDisabled, totalCount],
	);

	return (
		<Container>
			<Button
				loading={isLoading}
				size="small"
				type="link"
				disabled={isPreviousDisabled}
				onClick={handleNavigatePrevious}
			>
				<Flex align="center" gap="4px">
					<ChevronLeft size={16} /> Previous
				</Flex>
			</Button>
			<Button
				loading={isLoading}
				size="small"
				type="link"
				disabled={isNextDisabled}
				onClick={handleNavigateNext}
			>
				<Flex align="center" gap="4px">
					Next <ChevronRight size={16} />
				</Flex>
			</Button>

			{showSizeChanger && (
				<SelectSimple
					style={defaultSelectStyle}
					disabled={isLoading}
					value={String(countPerPage)}
					onChange={(value): void =>
						handleCountItemsPerPageChange(Number(value) as Pagination['limit'])
					}
					items={perPageOptions.map((count) => ({
						value: String(count),
						label: `${count} / page`,
					}))}
				/>
			)}
		</Container>
	);
}

Controls.defaultProps = {
	offset: 0,
	perPageOptions: DEFAULT_PER_PAGE_OPTIONS,
	isLogPanel: false,
	showSizeChanger: true,
};

export interface ControlsProps {
	offset?: Pagination['offset'];
	perPageOptions?: number[];
	totalCount: number;
	countPerPage: Pagination['limit'];
	isLoading: boolean;
	handleNavigatePrevious: () => void;
	handleNavigateNext: () => void;
	handleCountItemsPerPageChange: (value: Pagination['limit']) => void;
	isLogPanel?: boolean;
	showSizeChanger?: boolean;
}

export default memo(Controls);
