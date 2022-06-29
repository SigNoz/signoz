import { Input, Typography } from 'antd';
import styled from 'styled-components';

export const DurationText = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-around;
	min-height: 8vh;
	flex-direction: column;
`;

export const InputComponent = styled(Input)`
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Firefox */
	input[type='number'] {
		-moz-appearance: textfield;
	}
`;

export const InputContainer = styled.div`
	width: 100%;
	margin-top: 0.5rem;
	margin-bottom: 0.2rem;
`;

export const Text = styled(Typography)`
	&&& {
		text-align: left;
	}
`;

export const Container = styled.div`
	padding-left: 1rem;
	padding-right: 1rem;
`;
