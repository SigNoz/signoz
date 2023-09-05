import { Input, Row } from 'antd';
import { themeColors } from 'constants/theme';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import styled from 'styled-components';

export const FilterSearchInputStyled = styled(QueryBuilderSearch)`
	z-index: 1;
	.ant-select-selector {
		width: 100%;
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}
`;

export const ContainerStyled = styled(Row)`
	color: ${themeColors.white};
`;

export const SearchButtonStyled = styled(Input.Search)`
	width: 2rem;
	.ant-input {
		display: none;
	}
`;
