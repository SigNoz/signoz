import styled from 'styled-components';
import { Input } from 'antd';

const { Search } = Input;

export const Container = styled.div`
	display: flex;
	position: relative;
`;

export const SearchComponent = styled(Search)`
	.ant-btn-primary {
		svg {
			transform: scale(1.5);
		}
	}
`;
