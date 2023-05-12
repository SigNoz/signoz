import { Col, Row } from 'antd';
import React, { Fragment, memo, ReactNode, useState } from 'react';

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
}: AdditionalFiltersProps): JSX.Element {
	const [isOpenedFilters, setIsOpenedFilters] = useState<boolean>(false);

	const handleToggleOpenFilters = (): void => {
		setIsOpenedFilters((prevState) => !prevState);
	};

	const filtersTexts: ReactNode = listOfAdditionalFilter.map((str, index) => {
		const isNextLast = index + 1 === listOfAdditionalFilter.length - 1;

		if (index === listOfAdditionalFilter.length - 1) {
			return (
				<Fragment key={str}>
					{listOfAdditionalFilter.length > 1 && 'and'}{' '}
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
					{!isOpenedFilters && <span>Add conditions for {filtersTexts}</span>}
				</StyledInner>
			</Col>
			{isOpenedFilters && <Col span={24}>{children}</Col>}
		</Row>
	);
});
