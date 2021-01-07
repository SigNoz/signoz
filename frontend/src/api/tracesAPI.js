import axios from 'axios';
//import { format } from 'path';

export default axios.create({
  // baseURL: 'http://104.211.113.204:8080/api/v1/'
  // baseURL: process.env.QUERY_SERVICE_URL,
  // console.log('in traces API', process.env.QUERY_SERVICE_URL)
  baseURL: process.env.REACT_APP_QUERY_SERVICE_URL + '/api/v1',

});

//individual trace format
//https://api.signoz.io/api/traces/146754946da0552e

//http://104.211.113.204:8080/api/v1/traces/000000000000000053a5b7a93bc5e08a