import styled from 'styled-components';
import { Input } from 'antd';

const { Search } = Input;

export const Container = styled.div`
	display: flex;
	position: relative;
`;

export const SearchComponent = styled(Search)`
	&&& {
		min-height: 6vh;
		margin-top: 0.5rem;
	}

	.ant-btn-primary,
	.ant-input-affix-wrapper,
	.ant-input-wrapper {
		height: 100%;
	}
`;
