import type { SelectProps } from 'antd';
import { Select } from 'antd';
import cx from 'classnames';
import Space from 'periscope/components/Space/Space';
import { Typography } from '@signozhq/ui/typography';
import { getCategorySelectOptionByName } from 'constants/formats/alertFormatCategories';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSelectPopupContainer } from 'utils/selectPopupContainer';

import { categoryToSupport } from './config';
import { selectStyles } from './styles';
import type { IBuilderUnitsFilterProps } from './types';
import { filterOption } from './utils';

function BuilderUnitsFilter({
	onChange,
	yAxisUnit,
	className,
	labelClassName,
}: IBuilderUnitsFilterProps): JSX.Element {
	const getPopupContainer = useSelectPopupContainer();
	const { currentQuery, handleOnUnitsChange } = useQueryBuilder();

	const selectedValue = yAxisUnit || currentQuery?.unit;

	const allOptions = categoryToSupport.map((category) => ({
		label: category,
		options: getCategorySelectOptionByName(category),
	}));

	const onChangeHandler: SelectProps['onChange'] = (value): void => {
		if (onChange) {
			onChange(value);
		}

		handleOnUnitsChange(value);
	};

	return (
		<Space
			className={cx('builder-units-filter', className)}
			data-testid="builder-units-filter"
		>
			<span
				className={cx('builder-units-filter-label', labelClassName)}
				data-testid="builder-units-filter-label"
			>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					Y-axis unit
				</Typography>
			</span>
			<Select
				getPopupContainer={getPopupContainer}
				style={selectStyles}
				onChange={onChangeHandler}
				value={selectedValue}
				options={allOptions}
				allowClear
				showSearch
				optionFilterProp="label"
				placeholder="Select unit"
				filterOption={filterOption}
			/>
		</Space>
	);
}

export { BuilderUnitsFilter };
