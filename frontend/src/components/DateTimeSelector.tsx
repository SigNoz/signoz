import React, { useState } from 'react';
import {Select, Button,Space, Form} from 'antd';
import styled from 'styled-components';
import { withRouter } from "react-router";
import { RouteComponentProps } from 'react-router-dom';
import { connect } from 'react-redux';

import CustomDateTimeModal from './CustomDateTimeModal';
import { GlobalTime, updateTimeInterval } from '../actions';
import { StoreState } from '../reducers';
import FormItem from 'antd/lib/form/FormItem';

import {DateTimeRangeType} from '../actions'



const { Option } = Select;

const DateTimeWrapper = styled.div`
margin-top:20px;
`;

interface DateTimeSelectorProps extends RouteComponentProps<any> {
    currentpath?:string;
    updateTimeInterval: Function;
    globalTime: GlobalTime;
}


const _DateTimeSelector = (props:DateTimeSelectorProps) => {
    
    const [customDTPickerVisible,setCustomDTPickerVisible]=useState(false);
    const [timeInterval,setTimeInterval]=useState('15min')
    const [refreshButtonHidden, setRefreshButtonHidden]=useState(false)

    const [form_dtselector] = Form.useForm();


    const handleOnSelect = (value:string) =>
    {
        if (value === 'custom')
        {
            setCustomDTPickerVisible(true);
        }
        else
        {
            props.history.push({
                search: '?time='+value,
              }) //pass time in URL query param for all choices except custom in datetime picker
            props.updateTimeInterval(value);
            setTimeInterval(value);
            setRefreshButtonHidden(false); // for normal intervals, show refresh button
        }
    }

    //function called on clicking apply in customDateTimeModal
    const handleOk = (dateTimeRange:DateTimeRangeType) => 
    {
        // pass values in ms [minTime, maxTime]
        if (dateTimeRange!== null && dateTimeRange!== undefined && dateTimeRange[0]!== null && dateTimeRange[1]!== null )
        {
            props.updateTimeInterval('custom',[dateTimeRange[0].valueOf(),dateTimeRange[1].valueOf()])
            //setting globaltime
            setRefreshButtonHidden(true);
            form_dtselector.setFieldsValue({interval:(dateTimeRange[0].format("YYYY/MM/DD HH:mm")+'-'+dateTimeRange[1].format("YYYY/MM/DD HH:mm")) ,})
        }
        setCustomDTPickerVisible(false);
    }

    const timeSinceLastRefresh = () => {
        let timeDiffSec = Math.round((Date.now() - Math.round(props.globalTime.maxTime/1000000))/1000); 

        //How will Refresh button get updated? Needs to be periodically updated via timer.
        // For now, not returning any text here
        // if (timeDiffSec < 60)
        //     return timeDiffSec.toString()+' s';
        // else if (timeDiffSec < 3600)
        //     return Math.round(timeDiffSec/60).toString()+' min';
        // else 
        //     return Math.round(timeDiffSec/3600).toString()+' hr';
        return null;

    }

    const handleRefresh = () => 
    {   
        props.updateTimeInterval(timeInterval);
    }
        if (props.location.pathname.startsWith('/usage-explorer')) {
            return null;
        } else 
        {
        return (
            
            <DateTimeWrapper>
                <Space>
                <Form form={form_dtselector} layout='inline'  initialValues={{ interval:'15min', }} style={{marginTop: 10, marginBottom:10}}>
                <FormItem name='interval'> 
                    <Select  onSelect={handleOnSelect} >
                        <Option value="custom">Custom</Option>
                        <Option value="15min">Last 15 min</Option>
                        <Option value="30min">Last 30 min</Option>
                        <Option value="1hr">Last 1 hour</Option>
                        <Option value="6hr">Last 6 hour</Option>
                        <Option value="1day">Last 1 day</Option>
                        <Option value="1week">Last 1 week</Option>
                    </Select>
                </FormItem>
                
                <FormItem hidden={refreshButtonHidden} name='refresh_button'> 
                
                    <Button type="primary" onClick={handleRefresh}>Refresh {timeSinceLastRefresh()}</Button>
                    {/* if refresh time is more than x min, give a message? */}
                </FormItem>
                </Form>
                <CustomDateTimeModal 
                    visible={customDTPickerVisible}
                    onCreate={handleOk}
                    onCancel={() => {
                    setCustomDTPickerVisible(false);
                    }}
                    />
                </Space>
            </DateTimeWrapper>
            );
        }
    
}
const mapStateToProps = (state: StoreState ): { globalTime: GlobalTime} => {
    
    return {  globalTime : state.globalTime };
  };

  
export const DateTimeSelector  = connect(mapStateToProps, {
    updateTimeInterval: updateTimeInterval,

  })(_DateTimeSelector);

export default withRouter(DateTimeSelector);