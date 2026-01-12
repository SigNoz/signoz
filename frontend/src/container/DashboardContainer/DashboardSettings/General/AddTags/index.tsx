import './AddTags.styles.scss';

import { Col, Tooltip } from 'antd';
import Input from 'components/Input';
import { Dispatch, SetStateAction, useState } from 'react';

import { InputContainer, NewTagContainer, TagsContainer } from './styles';

function AddTags({ tags, setTags }: AddTagsProps): JSX.Element {
	const [inputValue, setInputValue] = useState<string>('');
	const [editInputIndex, setEditInputIndex] = useState(-1);
	const [editInputValue, setEditInputValue] = useState('');

	const handleInputConfirm = (): void => {
		if (inputValue) {
			setTags([...tags, inputValue]);
		}
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

	const onChangeHandler = (
		value: string,
		func: Dispatch<SetStateAction<string>>,
	): void => {
		func(value);
	};

	return (
		<TagsContainer>
			{tags.map((tag, index) => {
				if (editInputIndex === index) {
					return (
						<Col key={tag} lg={4} className="edit-input">
							<Input
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
						closable
						key={tag}
						onClose={(): void => handleClose(tag)}
						className="tag-container"
					>
						<span
							onDoubleClick={(e): void => {
								setEditInputIndex(index);
								setEditInputValue(tag);
								e.preventDefault();
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

			<InputContainer>
				<Input
					type="text"
					value={inputValue}
					rootClassName="tags-input"
					placeholder="Start typing your tag name"
					onChangeHandler={(event): void =>
						onChangeHandler(event.target.value, setInputValue)
					}
					onBlurHandler={handleInputConfirm}
					onPressEnterHandler={handleInputConfirm}
				/>
			</InputContainer>
		</TagsContainer>
	);
}

interface AddTagsProps {
	tags: string[];
	setTags: Dispatch<SetStateAction<string[]>>;
}

export default AddTags;
