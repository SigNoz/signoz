import React, { useState } from 'react';
import { Modal, Col, Row, DatePicker, TimePicker} from 'antd';
import { Store } from 'antd/lib/form/interface';
import {DateTimeRangeType} from '../actions'

const { RangePicker } = DatePicker;

interface CustomDateTimeModalProps {
  visible: boolean;
  onCreate: (dateTimeRange: DateTimeRangeType) => void; //Store is defined in antd forms library
  onCancel: () => void;
}


const CustomDateTimeModal: React.FC<CustomDateTimeModalProps> = ({ //destructuring props
  visible,
  onCreate,
  onCancel,
}) => {

  // RangeValue<Moment> == [Moment|null,Moment|null]|null

  const [customDateTimeRange, setCustomDateTimeRange]=useState<DateTimeRangeType>();

  function handleRangePickerOk(date_time: DateTimeRangeType) {
    console.log('onhandleRangePickerOk: ', date_time?date_time[0]?.toDate():null,date_time?date_time[1]?.toDate():null );
    setCustomDateTimeRange(date_time);
  }

  // function handleApplyDateTimeModal (){
  //   if (customDateTimeRange !== null && customDateTimeRange !== undefined && customDateTimeRange[0] !== null && customDateTimeRange[1] !== null  )
  //       console.log('in handleApplyDateTimeModal', customDateTimeRange[0].toDate(),customDateTimeRange[1].toDate())
  // }

  return (
    <Modal
      visible={visible}
      title="Chose date and time range"
      okText="Apply"
      cancelText="Cancel"
      onCancel={onCancel}
      // style={{  position: "absolute", top: 60, left: parseInt(`${positionleft}`) }} //get position as a prop from parent component, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
      style={{  position: "absolute", top: 60, right: 40 }} 
      onOk={() => onCreate(customDateTimeRange?customDateTimeRange:null)}
    >

      <RangePicker onOk={handleRangePickerOk} showTime />
      {/* <RangePicker renderExtraFooter={() => 'extra footer'} showTime /> */}
          {/* <Row>
            <Col span={6}> <DatePicker />
            </Col>
            <Col span={6}>
                <TimePicker />
            </Col>
            <Col span={6}>
                    
                    <DatePicker />
            </Col>
            <Col span={6}>
                <TimePicker />
            </Col>
          </Row> */}

    </Modal>
  );
};

export default CustomDateTimeModal;
