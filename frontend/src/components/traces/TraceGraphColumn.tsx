import React from 'react';
import { connect } from 'react-redux';
import { Table } from 'antd'

import {  traceResponseNew, pushDStree } from '../../actions';
import { StoreState } from '../../reducers'


interface TraceGraphColumnProps {
    traces: traceResponseNew,
}

interface TableDataSourceItem {
    key: string;
    operationName: string;
    startTime: number;
    duration: number;
  }
    

const _TraceGraphColumn = (props: TraceGraphColumnProps) => {

    const columns: any = [
        {
          title: 'Start Time (UTC Time)',
          dataIndex: 'startTime',
          key: 'startTime',
          sorter: (a:any, b:any) => a.startTime - b.startTime,
          sortDirections: ['descend', 'ascend'],
          render: (value: number) => (new Date(Math.round(value/1000))).toUTCString()

          // render: (value: number) => (new Date(Math.round(value/1000))).toLocaleDateString()+' '+(new Date(Math.round(value/1000))).toLocaleTimeString()
        },
        {
          title: 'Duration (in ms)',
          dataIndex: 'duration',
          key: 'duration',
          sorter: (a:any, b:any) => a.duration - b.duration,
          sortDirections: ['descend', 'ascend'],
          render: (value: number) => (value/1000000).toFixed(2),
        },
        {
          title: 'Operation',
          dataIndex: 'operationName',
          key: 'operationName',
        },
       
      ];

      let dataSource :TableDataSourceItem[] = [];

      // PNOTE - Define new array
      // if (props.traces.data.length > 0)
      // {
      // props.traces.data[0].spans.map((item: spanItem, index ) => dataSource.push({startTime: item.startTime,  operationName: item.operationName , duration: item.duration, key:index.toString()}) );
      // }

      if (props.traces[0].events.length > 0) {
   
        props.traces[0].events.map((item: (number|string|string[]|pushDStree[])[], index ) => { 
          if (typeof item[0] === 'number' && typeof item[4] === 'string' && typeof item[6] === 'string' && typeof item[1] === 'string' && typeof item[2] === 'string' )
            dataSource.push({startTime: item[0],  operationName: item[4] , duration:parseInt(item[6]), key:index.toString()});
        });
    }

        return (

            <div>
                {/* <div>Tracing Graph Column Page</div> */}
                <Table dataSource={dataSource} columns={columns} size="middle"/>;
            </div>
        );
    
}

const mapStateToProps = (state: StoreState): { traces: traceResponseNew } => {
    // console.log(state);
    return {  traces : state.traces };
  };
  // the name mapStateToProps is only a convention
  // take state and map it to props which are accessible inside this component
  
export const TraceGraphColumn = connect(mapStateToProps)(_TraceGraphColumn);