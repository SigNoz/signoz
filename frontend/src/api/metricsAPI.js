import axios from 'axios';

export default axios.create({
     baseURL: 'http://104.211.113.204:8080/api/v1/',
    
    // baseURL: 'http://localhost:3000/api/v1/',
    
}
);