import axios from 'axios';

export default axios.create({
      // baseURL: 'http://104.211.113.204:8080/api/v1/',
    // baseURL: process.env.REACT_APP_QUERY_SERVICE_URL,
    // console.log('in metrics API', process.env.QUERY_SERVICE_URL)
    baseURL: '/api/v1/',
    
}
);