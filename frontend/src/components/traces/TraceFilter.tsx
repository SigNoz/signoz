import React,{useEffect, useState} from 'react';
import { Select, Button, Input,  Tag, Card, Form, AutoComplete} from 'antd';
import { connect } from 'react-redux';
import { Store } from 'antd/lib/form/interface';
import styled from 'styled-components';

import { updateTraceFilters,  fetchTraces, TraceFilters, GlobalTime } from '../../actions';
import { StoreState } from '../../reducers';
import LatencyModalForm from './LatencyModalForm';
import {FilterStateDisplay} from './FilterStateDisplay';


import FormItem from 'antd/lib/form/FormItem';
import metricsAPI from '../../api/metricsAPI';
 

const { Option } = Select;

const InfoWrapper = styled.div`
padding-top:10px;
font-style:italic;
font-size: 12px;
`;

interface TraceFilterProps {
    traceFilters: TraceFilters,
    globalTime: GlobalTime,
    updateTraceFilters: Function,
    fetchTraces: Function,
}

interface TagKeyOptionItem {   
    "tagKeys": string;
    "tagCount": number;
}

const _TraceFilter = (props: TraceFilterProps) => {

    const [serviceList, setServiceList] = useState<string[]>([]);
    const [operationList, setOperationsList] = useState<string[]>([]);
    const [tagKeyOptions, setTagKeyOptions] = useState<TagKeyOptionItem[]>([]);


    useEffect( () => {
        metricsAPI.get<string[]>('services/list').then(response => {
            // console.log(response.data);
            setServiceList( response.data );
        });
      }, []);

    useEffect( () => {
        let request_string='service='+props.traceFilters.service+
                           '&operation='+props.traceFilters.operation+
                           '&maxDuration='+props.traceFilters.latency?.max+
                           '&minDuration='+props.traceFilters.latency?.min
        if(props.traceFilters.tags)
            request_string=request_string+'&tags='+encodeURIComponent(JSON.stringify(props.traceFilters.tags));

        props.fetchTraces(props.globalTime, request_string)
        console.log('stringified traceFilters redux state',encodeURIComponent(JSON.stringify(props.traceFilters.tags)));
    }, [props.traceFilters,props.globalTime]);


    //   useEffect( () => {
       
    //     tagKeyOptions.map(s => options.push({'value':s.tagKeys}));
    //     console.log('tagoptions USeEffect',options)
    //   }, [tagKeyOptions]);

    // Use effects run in the order they are specified

    useEffect ( () => {

        let latencyButtonText = 'Latency';
        if (props.traceFilters.latency?.min === '' && props.traceFilters.latency?.max !== '')
            latencyButtonText = 'Latency<'+(parseInt(props.traceFilters.latency?.max)/1000000).toString()+'ms';
        else if (props.traceFilters.latency?.min !== '' && props.traceFilters.latency?.max === '')
            latencyButtonText = 'Latency>'+(parseInt(props.traceFilters.latency?.min)/1000000).toString()+'ms';
        else if ( props.traceFilters.latency !== undefined && props.traceFilters.latency?.min !== '' && props.traceFilters.latency?.max !== '')
            latencyButtonText = (parseInt(props.traceFilters.latency.min)/1000000).toString()+'ms <Latency<'+(parseInt(props.traceFilters.latency.max)/1000000).toString()+'ms';

        
        form_basefilter.setFieldsValue({latency:latencyButtonText ,})

    }, [props.traceFilters.latency])

    useEffect ( () => {
        
        form_basefilter.setFieldsValue({service: props.traceFilters.service,})

    }, [props.traceFilters.service])

    useEffect ( () => {
        
        form_basefilter.setFieldsValue({operation: props.traceFilters.operation,})

    }, [props.traceFilters.operation])

        const [modalVisible, setModalVisible] = useState(false); 
        const [loading] = useState(false); 

        const [tagKeyValueApplied, setTagKeyValueApplied]=useState(['']);
        const [latencyFilterValues, setLatencyFilterValues]=useState({min:'',max:''})
 
        const [form] = Form.useForm();

        const [form_basefilter] = Form.useForm();

        function handleChange(value:string) {
            console.log(value);
        }

        function handleChangeOperation(value:string) {
            props.updateTraceFilters({...props.traceFilters,operation:value})
        }

        function handleChangeService(value:string) {
            console.log(value);
            let service_request='/service/'+value+'/operations';
            metricsAPI.get<string[]>(service_request).then(response => {
                console.log('operations',response.data);
                // form_basefilter.resetFields(['operation',])
                setOperationsList( response.data );
            });

            let tagkeyoptions_request='tags?service='+value;
            metricsAPI.get<TagKeyOptionItem[]>(tagkeyoptions_request).then(response => {
                console.log('tag key options',response.data);
                setTagKeyOptions( response.data );
            });

            props.updateTraceFilters({...props.traceFilters,service:value})

        }

        const onLatencyButtonClick = () => {
            setModalVisible(true);
        }
        
        
        const onLatencyModalApply = (values: Store) => {
            setModalVisible(false);
            console.log('Received values of form: ', values);
            //Latency modal form returns null if the value entered is not a number or string etc or empty
            props.updateTraceFilters({...props.traceFilters,latency:{min:values.min?(parseInt(values.min)*1000000).toString():"", max:values.max?(parseInt(values.max)*1000000).toString():""}})
            // setLatencyFilterValues()
        }

        const onTagFormSubmit = (values:any) => {
            console.log(values);
            
            // setTagKeyValueApplied(tagKeyValueApplied => [...tagKeyValueApplied, values.tag_key+' '+values.operator+' '+values.tag_value]);
            // making API calls with only tags data for testing, for last tagform submit
            // ideally all tags including service, operations, tags, latency selected should be in one state and used
            // to make API call and update trace list
            let request_tags= 'service=frontend&tags='+encodeURIComponent(JSON.stringify([{"key":values.tag_key,"value":values.tag_value,"operator":values.operator}]))
            // props.fetchTraces(request_tags)

            // form field names are tag_key & tag_value
            // data structure has key, value & operator

            if (props.traceFilters.tags){ // If there are existing tag filters present
                props.updateTraceFilters(
                    {   
                        service:props.traceFilters.service, 
                        operation:props.traceFilters.operation,
                        latency:props.traceFilters.latency,
                        tags:[...props.traceFilters.tags, {'key':values.tag_key,'value':values.tag_value,'operator':values.operator}]
                    });
            }
            else
            {
                props.updateTraceFilters(
                    {   
                        service:props.traceFilters.service, 
                        operation:props.traceFilters.operation,
                        latency:props.traceFilters.latency,
                        tags:[ {'key':values.tag_key,'value':values.tag_value,'operator':values.operator}]
                    });
            }

            form.resetFields();
        }

        const onTagClose = (value:string) => {
            console.log(value);
            // setJoinList(joinList.filter((e)=>(e !== name)))
            // removing closed tag from the tagKeyValueApplied array
            setTagKeyValueApplied(tagKeyValueApplied.filter( e => (e !== value)));

        }

        // For autocomplete
        //Setting value when autocomplete field is changed
        const onChangeTagKey = (data: string) => {
            form.setFieldsValue({ tag_key: data });
          };

        const dataSource = ['status:200'];
        const children = [];
        for (let i = 0; i < dataSource.length; i++) {
        children.push(<Option value={dataSource[i]} key={dataSource[i]}>{dataSource[i]}</Option>);
        }

    

        // PNOTE - Remove any
        const handleApplyFilterForm = (values:any) => {
            console.log('values are', values);
            console.log(typeof(values.service))
            console.log(typeof(values.operation))
            let request_params: string ='';
            if (typeof values.service !== undefined && typeof(values.operation)  !== undefined)
            {
                request_params = 'service='+values.service+'&operation='+values.operation;
            } 
            else if (typeof values.service === undefined && typeof values.operation !== undefined)
            {
                request_params = 'operation='+values.operation;
            }
            else if (typeof values.service !== undefined && typeof values.operation === undefined)
            {
                request_params = 'service='+values.service;
            }
                
            request_params=request_params+'&minDuration='+latencyFilterValues.min+'&maxDuration='+latencyFilterValues.max;
            console.log(request_params);

            // props.fetchTraces(request_params)

            // console.log(props.inputTag)
            // props.updateTagFilters([{key:props.inputTag, value: props.inputTag }]);
            setTagKeyValueApplied(tagKeyValueApplied => [...tagKeyValueApplied, 'service eq'+values.service, 'operation eq '+values.operation, 'maxduration eq '+ (parseInt(latencyFilterValues.max)/1000000).toString(), 'minduration eq '+(parseInt(latencyFilterValues.min)/1000000).toString()]);
            props.updateTraceFilters({'service':values.service,'operation':values.operation,'latency':latencyFilterValues})
        }


        return (
            <div>
                <div>Filter Traces</div>
                <div>{JSON.stringify(props.traceFilters)}</div>

                <Form form={form_basefilter} layout='inline' onFinish={handleApplyFilterForm} initialValues={{ service:'', operation:'',latency:'Latency',}} style={{marginTop: 10, marginBottom:10}}>
                    <FormItem rules={[{ required: true }]} name='service'>  
                        <Select showSearch style={{ width: 180 }} onChange={handleChangeService} placeholder='Select Service' allowClear>
                            {serviceList.map( s => <Option value={s}>{s}</Option>)}
                        </Select>
                    </FormItem>

                <FormItem name='operation'>  
                    <Select showSearch style={{ width: 180 }} onChange={handleChangeOperation} placeholder='Select Operation' allowClear>
                        {operationList.map( item => <Option value={item}>{item}</Option>)}
                        {/* We need to URL encode before making API call on form submission */}
                        {/* <Option value="HTTP%20GET">HTTP GET</Option>
                        <Option value="HTTP%20GET%20%2Fdispatch">HTTP GET /dispatch</Option>
                        <Option value="HTTP%20GET%3A%20%2Froute">HTTP GET: /route</Option>
                        <Option value="%2Fdriver.DriverService%2FFindNearest">/driver.DriverService/FindNearest</Option>
                        <Option value="HTTP%20GET%20%2Fcustomer">HTTP GET /customer</Option> */}
                      
                    </Select>
                </FormItem>

                <FormItem name='latency'>  
                    <Input style={{ width: 200 }} type='button'  onClick={onLatencyButtonClick}/>
                </FormItem>
 
                {/* <FormItem>
                    <Button type="primary" htmlType="submit">Apply Filters</Button>
                </FormItem> */}
                </Form>
                
                <FilterStateDisplay />

                {/* <Card style={{padding: 6, marginTop: 10, marginBottom: 10}} bodyStyle={{padding: 6}}>
                    <Tag style={{fontSize:14, padding: 8}} closable> status:200 </Tag><Tag style={{fontSize:14, padding: 8}}  closable> customerid:123 </Tag>
                    {tagKeyValueApplied.map( item => <Tag key={item} style={{fontSize:14, padding: 8}} onClose={() => onTagClose(item)} closable> {item} </Tag>)}
                </Card> */}
                {/* // What will be the empty state of card when there is no Tag , it should show something */}
                        
                <InfoWrapper>Select Service to get Tag suggestions </InfoWrapper>
                     
                <Form form={form} layout='inline' onFinish={onTagFormSubmit} initialValues={{operator:'equals'}} style={{marginTop: 10, marginBottom:10}}>

                    <FormItem rules={[{ required: true }]} name='tag_key'>
                        {/* <Input style={{ width: 160, textAlign: 'center' }} placeholder="Tag Key" /> */}
                        {/* Not using tag count data to show in options */}

                        <AutoComplete
                        options={tagKeyOptions.map((s) => { return ({'value' : s.tagKeys}) })} 
                        style={{ width: 200, textAlign: 'center' }}
                        // onSelect={onSelect}
                        // onSearch={onSearch}
                        onChange={onChangeTagKey}
                        filterOption={(inputValue, option) =>
                            option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                        }
                        placeholder="Tag Key"
                        />
                        {/* // ! means that we are saying object can't be undefined */}
                    </FormItem>

                    <FormItem name='operator'>
                        <Select  style={{ width: 120, textAlign: 'center' }}>
                            <Option value="equals">EQUAL</Option>
                            <Option value="contains">CONTAINS</Option>
                            {/* <Option value="not-in">NOT IN</Option> */}
                        </Select>
                    </FormItem>

                    <FormItem rules={[{ required: true }]} name='tag_value'>
                        <Input style={{ width: 160, textAlign: 'center',}} placeholder="Tag Value" />
                    </FormItem>

                    <FormItem>
                        <Button type="primary" htmlType="submit"> Apply Tag Filter </Button> 
                    </FormItem>

                </Form>

                <LatencyModalForm
                    visible={modalVisible}
                    onCreate={onLatencyModalApply}
                    onCancel={() => {
                    setModalVisible(false);
                    }}
                />
            </div>
        );
}

const mapStateToProps = (state: StoreState): { traceFilters: TraceFilters, globalTime: GlobalTime } => {
    // console.log(state);
    return { traceFilters: state.traceFilters, globalTime: state.globalTime };
};

export const TraceFilter = connect(mapStateToProps, {
    updateTraceFilters: updateTraceFilters,
    fetchTraces: fetchTraces,
})(_TraceFilter);