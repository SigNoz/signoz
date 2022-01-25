import styled from 'styled-components';
import { Input } from 'antd';

const { Search } = Input;

export const Container = styled.div`
	display: flex;
	position: relative;
`;

export const SearchComponent = styled(Search)`
	&&& {
		min-height: 5.5vh;
		margin-top: 0.5rem;
	}

	.ant-btn-primary {
		width: 50px;
		height: 50px;

		svg {
			transform: scale(1.5);
		}
	}

	.ant-btn-primary,
	.ant-input-affix-wrapper,
	.ant-input-wrapper {
		height: 100%;
	}
`;
