import axios from 'axios';
//import { format } from 'path';

export default axios.create({
  // baseURL: 'http://104.211.113.204:8080/api/v1/'
  
  // baseURL: 'http://localhost:3000/api/v1/', // toggle to this before pushing

  // baseURL: process.env.QUERY_SERVICE_URL,
  // console.log('in traces API', process.env.QUERY_SERVICE_URL)
  baseURL: 'api/v1/',
  
});

