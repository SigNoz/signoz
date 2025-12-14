import { Col, Row, Select } from 'antd';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { find } from 'lodash-es';
import {
	ChangeEvent,
	Dispatch,
	SetStateAction,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { TTTLType } from 'types/api/settings/common';

import {
	Input,
	RetentionContainer,
	RetentionFieldInputContainer,
	RetentionFieldLabel,
} from './styles';
import {
	convertHoursValueToRelevantUnit,
	SettingPeriod,
	TimeUnits,
	TimeUnitsValues,
} from './utils';

const { Option } = Select;

function Retention({
	type,
	retentionValue,
	setRetentionValue,
	text,
	hide,
	isS3Field = false,
}: RetentionProps): JSX.Element | null {
	// Filter available units based on type and field
	const availableUnits = useMemo(
		() =>
			TimeUnits.filter((option) => {
				if (type === 'logs') {
					// For S3 cold storage fields: only allow Days
					if (isS3Field) {
						return option.value === TimeUnitsValues.day;
					}
					// For total retention: allow Days and Months (not Hours)
					return option.value !== TimeUnitsValues.hr;
				}
				return true;
			}),
		[type, isS3Field],
	);

	// Convert the hours value using only the available units
	const {
		value: initialValue,
		timeUnitValue: initialTimeUnitValue,
	} = convertHoursValueToRelevantUnit(Number(retentionValue), availableUnits);

	const [selectedTimeUnit, setSelectTimeUnit] = useState(initialTimeUnitValue);
	const [selectedValue, setSelectedValue] = useState<number | null>(
		initialValue,
	);
	const interacted = useRef(false);

	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	useEffect(() => {
		if (!interacted.current) setSelectedValue(initialValue);
	}, [initialValue]);

	useEffect(() => {
		if (!interacted.current) setSelectTimeUnit(initialTimeUnitValue);
	}, [initialTimeUnitValue]);

	const menuItems = availableUnits.map((option) => (
		<Option key={option.value} value={option.value}>
			{option.key}
		</Option>
	));

	const currentSelectedOption = (option: SettingPeriod): void => {
		const selectedValue = find(availableUnits, (e) => e.value === option)?.value;
		if (selectedValue) setSelectTimeUnit(selectedValue);
	};

	useEffect(() => {
		const inverseMultiplier = find(
			availableUnits,
			(timeUnit) => timeUnit.value === selectedTimeUnit,
		)?.multiplier;
		if (!selectedValue) setRetentionValue(null);
		if (selectedValue && inverseMultiplier) {
			setRetentionValue(selectedValue * (1 / inverseMultiplier));
		}
	}, [selectedTimeUnit, selectedValue, setRetentionValue, availableUnits]);

	const onChangeHandler = (
		e: ChangeEvent<HTMLInputElement>,
		func: Dispatch<SetStateAction<number | null>>,
	): void => {
		interacted.current = true;
		const { value } = e.target;
		const integerValue = parseInt(value, 10);

		if (value.length > 0 && integerValue.toString() === value) {
			const parsedValue = Math.abs(integerValue);
			func(parsedValue);
		}

		if (value.length === 0) {
			func(null);
		}
	};

	if (hide) {
		return null;
	}

	return (
		<RetentionContainer>
			<Row justify="space-between">
				<Col span={12} style={{ display: 'flex' }}>
					<RetentionFieldLabel>{text}</RetentionFieldLabel>
				</Col>
				<Row justify="end">
					<RetentionFieldInputContainer>
						<Input
							value={selectedValue && selectedValue >= 0 ? selectedValue : ''}
							disabled={isCloudUserVal}
							onChange={(e): void => onChangeHandler(e, setSelectedValue)}
							style={{ width: 75 }}
						/>
						<Select
							value={selectedTimeUnit}
							onChange={currentSelectedOption}
							disabled={isCloudUserVal}
							style={{ width: 100 }}
						>
							{menuItems}
						</Select>
					</RetentionFieldInputContainer>
				</Row>
			</Row>
		</RetentionContainer>
	);
}

interface RetentionProps {
	type: TTTLType;
	retentionValue: number | null;
	text: string;
	setRetentionValue: Dispatch<SetStateAction<number | null>>;
	hide: boolean;
	isS3Field?: boolean;
}

Retention.defaultProps = {
	isS3Field: false,
};
export default Retention;
