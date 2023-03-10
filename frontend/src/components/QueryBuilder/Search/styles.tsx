import { Select as AtnSelect, Tag as AntTag } from 'antd';
import styled from 'styled-components';

const Tag = styled(AntTag)`
	font-style: normal;
	font-weight: 300;
	font-size: 12px;
	margin-inline-end: 4px;
`;

const SelectStyled = styled(AtnSelect)`
	width: 100%;
` as typeof AtnSelect;

export { SelectStyled, Tag };
