import generatePicker from 'antd/es/date-picker/generatePicker';
import dayjsGenerateConfig from 'antd/node_modules/rc-picker/lib/generate/dayjs';

const DatePicker = generatePicker(dayjsGenerateConfig);

export default DatePicker;
