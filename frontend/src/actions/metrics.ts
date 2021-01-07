import { Dispatch } from 'redux';
import metricsAPI from '../api/metricsAPI';
import { GlobalTime } from './global';
import { ActionTypes } from './types';

export interface servicesListItem{
    "serviceName": string;
    "p99": number;
    "avgDuration": number;
    "numCalls": number;
    "callRate": number;
    "numErrors": number;
    "errorRate": number;
};

export interface metricItem{
  "timestamp":number;
  "p50":number;
  "p90":number;
  "p99":number;
  "numCalls":number;
  "callRate":number;
  "numErrors":number;
  "errorRate":number;
}

export interface topEndpointListItem{
  "p50": number;
  "p90": number;
  "p99": number;
  "numCalls": number;
  "name": string;
};

export interface customMetricsItem{
    "timestamp": number;
    "value": number;
};


export interface getServicesListAction {
    type: ActionTypes.getServicesList;
    payload: servicesListItem[];
  }

export interface getServiceMetricsAction{
    type: ActionTypes.getServiceMetrics;
    payload: metricItem[];
}

export interface getTopEndpointsAction {
  type: ActionTypes.getTopEndpoints;
  payload: topEndpointListItem[];
}

export interface getFilteredTraceMetricsAction{
  type: ActionTypes.getFilteredTraceMetrics;
  payload: customMetricsItem[];
}


export const getServicesList = (globalTime: GlobalTime) => {
    return async (dispatch: Dispatch) => {
        let request_string = 'services?start='+globalTime.minTime+'&end='+globalTime.maxTime;
        const response = await metricsAPI.get<servicesListItem[]>(request_string);
    
        dispatch<getServicesListAction>({
          type: ActionTypes.getServicesList,
          payload: response.data
          //PNOTE - response.data in the axios response has the actual API response
        });
      };
};

export const getServicesMetrics = (serviceName:string, globalTime: GlobalTime) => {
  return async (dispatch: Dispatch) => {
      let request_string = 'service/overview?service='+serviceName+'&start='+globalTime.minTime+'&end='+globalTime.maxTime+'&step=60';
      const response = await metricsAPI.get<metricItem[]>(request_string);
  
      dispatch<getServiceMetricsAction>({
        type: ActionTypes.getServiceMetrics,
        payload: response.data
        //PNOTE - response.data in the axios response has the actual API response
      });
    };
};

export const getTopEndpoints = (serviceName:string, globalTime: GlobalTime) => {
  return async (dispatch: Dispatch) => {
      let request_string = 'service/top_endpoints?service='+serviceName+'&start='+globalTime.minTime+'&end='+globalTime.maxTime;
      const response = await metricsAPI.get<topEndpointListItem[]>(request_string);
  
      dispatch<getTopEndpointsAction>({
        type: ActionTypes.getTopEndpoints,
        payload: response.data
        //PNOTE - response.data in the axios response has the actual API response
      });
    };
};

export const getFilteredTraceMetrics = (filter_params: string, globalTime: GlobalTime) => {
  return async (dispatch: Dispatch) => {
      let request_string = 'spans/aggregates?start='+globalTime.minTime+'&end='+globalTime.maxTime+'&'+filter_params;
      const response = await metricsAPI.get<customMetricsItem[]>(request_string);
  
      dispatch<getFilteredTraceMetricsAction>({
        type: ActionTypes.getFilteredTraceMetrics,
        payload: response.data
        //PNOTE - response.data in the axios response has the actual API response
      });
    };
};