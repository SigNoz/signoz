import React, {useEffect} from 'react';
import { useLocation } from "react-router-dom";
import { NavLink } from 'react-router-dom'
import { Table } from 'antd';
import styled from 'styled-components';
import { connect } from 'react-redux';


import { getServicesList, GlobalTime, servicesListItem } from '../../actions';
import { StoreState } from '../../reducers'

interface ServicesTableProps {
  servicesList: servicesListItem[],
  getServicesList: Function,
  globalTime: GlobalTime,
}

const Wrapper = styled.div`
padding-top:40px;
padding-bottom:40px;
padding-left:40px;
padding-right:40px;
.ant-table table { font-size: 12px; };
.ant-table tfoot>tr>td, .ant-table tfoot>tr>th, .ant-table-tbody>tr>td, .ant-table-thead>tr>th { padding: 10px; };
`;

//styling antd with styled components - https://codesandbox.io/s/8x1r670rxj




const columns = [

    {
        title: 'Application',
        dataIndex: 'serviceName',
        key: 'serviceName',
        render: (text :string) => <NavLink style={{textTransform:'capitalize'}} to={'/application/' + text}><strong>{text}</strong></NavLink>,
    },
    {
        title: 'P99 latency (in ms)',
        dataIndex: 'p99',
        key: 'p99',
         sorter: (a:any, b:any) => a.p99 - b.p99,
        // sortDirections: ['descend', 'ascend'],
        render: (value: number) => (value/1000000).toFixed(2),
    },
    {
        title: 'Error Rate (in %)',
        dataIndex: 'errorRate',
        key: 'errorRate',
        sorter: (a:any, b:any) => a.errorRate - b.errorRate,
        // sortDirections: ['descend', 'ascend'],
        render: (value: number) => (value*100).toFixed(2),
    },
    {
        title: 'Requests Per Second',
        dataIndex: 'callRate',
        key: 'callRate',
        sorter: (a:any, b:any) => a.callRate - b.callRate,
        // sortDirections: ['descend', 'ascend'],
        render: (value: number) => value.toFixed(2),
    },

];


const _ServicesTable = (props: ServicesTableProps) => {

    const search = useLocation().search;
    const time_interval = new URLSearchParams(search).get('time');
    console.log(time_interval)
    
    useEffect( () => {
        props.getServicesList(props.globalTime);
      }, [props.globalTime]);


    return(
        
        <Wrapper>
            {console.log(props.servicesList)}
            <Table dataSource={props.servicesList} columns={columns} pagination={false} />
        </Wrapper>

    );

}

const mapStateToProps = (state: StoreState): { servicesList: servicesListItem[], globalTime: GlobalTime } => {
    // console.log(state);
    return {  servicesList : state.servicesList, globalTime:state.globalTime};
  };
  // the name mapStateToProps is only a convention
  // take state and map it to props which are accessible inside this component
  
  export const ServicesTable = connect(mapStateToProps, {
    getServicesList: getServicesList,
  })(_ServicesTable);