import { PlusOutlined } from '@ant-design/icons';
import { Col, Tooltip, Typography } from 'antd';
import Input from 'components/Input';
import React, { useState } from 'react';

import { NewTagContainer, TagsContainer } from './styles';

const AddTags = (): JSX.Element => {
	const [tags, setTags] = useState<string[]>([]);
	const [inputValue, setInputValue] = useState<string>('');
	const [inputVisible, setInputVisible] = useState<boolean>(false);
	const [editInputIndex, setEditInputIndex] = useState(-1);
	const [editInputValue, setEditInputValue] = useState('');

	const handleInputConfirm = (): void => {
		let prevTags: string[] = [];

		if (inputValue) {
			prevTags = [...tags, inputValue];
		}
		setTags(prevTags);
		setInputVisible(false);
		setInputValue('');
	};

	const handleEditInputConfirm = (): void => {
		const newTags = [...tags];
		newTags[editInputIndex] = editInputValue;
		setTags(newTags);
		setEditInputIndex(-1);
		setInputValue('');
	};

	const handleClose = (removedTag: string): void => {
		const newTags = tags.filter((tag) => tag !== removedTag);
		setTags(newTags);
	};

	const showInput = (): void => {
		setInputVisible(true);
	};

	const onChangeHandler = (
		value: string,
		func: React.Dispatch<React.SetStateAction<string>>,
	): void => {
		func(value);
	};

	return (
		<TagsContainer>
			{tags.map((tag, index) => {
				if (editInputIndex === index) {
					return (
						<Col lg={4}>
							<Input
								key={tag}
								size="small"
								value={editInputValue}
								onChangeHandler={(event): void =>
									onChangeHandler(event.target.value, setEditInputValue)
								}
								onBlurHandler={handleEditInputConfirm}
								onPressEnterHandler={handleEditInputConfirm}
							/>
						</Col>
					);
				}

				const isLongTag = tag.length > 20;

				const tagElem = (
					<NewTagContainer
						key={tag}
						closable={index !== 0}
						onClose={(): void => handleClose(tag)}
					>
						<span
							onDoubleClick={(e): void => {
								if (index !== 0) {
									setEditInputIndex(index);
									setEditInputValue(tag);
									e.preventDefault();
								}
							}}
						>
							{isLongTag ? `${tag.slice(0, 20)}...` : tag}
						</span>
					</NewTagContainer>
				);

				return isLongTag ? (
					<Tooltip title={tag} key={tag}>
						{tagElem}
					</Tooltip>
				) : (
					tagElem
				);
			})}

			{inputVisible && (
				<Col lg={4}>
					<Input
						type="text"
						size="small"
						value={inputValue}
						onChangeHandler={(event): void =>
							onChangeHandler(event.target.value, setInputValue)
						}
						onBlurHandler={handleInputConfirm}
						onPressEnterHandler={handleInputConfirm}
					/>
				</Col>
			)}

			{!inputVisible && (
				<NewTagContainer onClick={showInput}>
					<PlusOutlined />
					<Typography>New Tag</Typography>
				</NewTagContainer>
			)}
		</TagsContainer>
	);
};

export default AddTags;
