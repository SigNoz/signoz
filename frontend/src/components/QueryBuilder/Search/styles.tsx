import { Select as AntSelect, Tag as AntTag } from 'antd';
import styled from 'styled-components';

const Tag = styled(AntTag)`
	font-style: normal;
	font-weight: 300;
	font-size: 0.75rem;
	margin-inline-end: 4px;
`;

const SelectStyled = styled(AntSelect)`
	width: 100%;
` as typeof AntSelect;

export { SelectStyled, Tag };
