import { Col, Row, Typography } from 'antd';
import { Fragment, memo, ReactNode, useState } from 'react';

// ** Types
import { AdditionalFiltersProps } from './AdditionalFiltersToggler.interfaces';
// ** Styles
import {
	StyledIconClose,
	StyledIconOpen,
	StyledInner,
	StyledLink,
} from './AdditionalFiltersToggler.styled';

export const AdditionalFiltersToggler = memo(function AdditionalFiltersToggler({
	children,
	listOfAdditionalFilter,
	hideLimit,
	queryname,
}: AdditionalFiltersProps): JSX.Element {
	const [isOpenedFilters, setIsOpenedFilters] = useState<boolean>(false);

	const handleToggleOpenFilters = (): void => {
		setIsOpenedFilters((prevState) => !prevState);
	};
	const filtersToDisplay = listOfAdditionalFilter.filter(
		(str) => !(hideLimit && queryname === 'traces' && str === 'Limit'),
	);
	const filtersTexts: ReactNode = filtersToDisplay.map((str, index) => {
		const isNextLast = index + 1 === filtersToDisplay.length - 1;
		if (index === filtersToDisplay.length - 1) {
			return (
				<Fragment key={str}>
					{filtersToDisplay.length > 1 && 'and'}{' '}
					<StyledLink>{str.toUpperCase()}</StyledLink>
				</Fragment>
			);
		}

		return (
			<span key={str}>
				<StyledLink>{str.toUpperCase()}</StyledLink>
				{isNextLast ? ' ' : ', '}
			</span>
		);
	});

	return (
		<Row>
			<Col span={24}>
				<StyledInner onClick={handleToggleOpenFilters}>
					{isOpenedFilters ? <StyledIconClose /> : <StyledIconOpen />}
					{!isOpenedFilters && (
						<Typography>Add conditions for {filtersTexts}</Typography>
					)}
				</StyledInner>
			</Col>
			{isOpenedFilters && <Col span={24}>{children}</Col>}
		</Row>
	);
});
