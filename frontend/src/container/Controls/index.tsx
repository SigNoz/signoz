import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import { DEFAULT_PER_PAGE_OPTIONS, Pagination } from 'hooks/queryPagination';
import { memo, useMemo } from 'react';

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
}: ControlsProps): JSX.Element | null {
	const isNextAndPreviousDisabled = useMemo(
		() => isLoading || countPerPage < 0 || totalCount === 0,
		[isLoading, countPerPage, totalCount],
	);
	const isPreviousDisabled = useMemo(() => offset <= 0, [offset]);
	const isNextDisabled = useMemo(() => totalCount < countPerPage, [
		countPerPage,
		totalCount,
	]);

	return (
		<Container>
			<Button
				loading={isLoading}
				size="small"
				type="link"
				disabled={isPreviousDisabled || isNextAndPreviousDisabled}
				onClick={handleNavigatePrevious}
			>
				<LeftOutlined /> Previous
			</Button>
			<Button
				loading={isLoading}
				size="small"
				type="link"
				disabled={isNextDisabled || isNextAndPreviousDisabled}
				onClick={handleNavigateNext}
			>
				Next <RightOutlined />
			</Button>
			<Select<Pagination['limit']>
				style={defaultSelectStyle}
				loading={isLoading}
				value={countPerPage}
				onChange={handleCountItemsPerPageChange}
			>
				{perPageOptions.map((count) => (
					<Select.Option
						key={count}
						value={count}
					>{`${count} / page`}</Select.Option>
				))}
			</Select>
		</Container>
	);
}

Controls.defaultProps = {
	offset: 0,
	perPageOptions: DEFAULT_PER_PAGE_OPTIONS,
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
}

export default memo(Controls);
