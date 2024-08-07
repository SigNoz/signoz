## Consumer Lag feature break down

### 1) Consumer Lag Graph


---

### 2) Consumer Group Details

API endpoint:

```
POST /api/v1/messaging-queues/kafka/consumer-lag/consumer-details
```

```json
{
	"start": 1720685296000000000,
	"end": 1721290096000000000,
	"variables": {
        "partition": "0",
		"topic": "topic1",
        "consumer_group": "cg1"
	}
}
```

response in query range format `series`
```json
{
    "status": "success",
    "data": {
        "resultType": "",
        "result": [
            {
                "table": {
                    "columns": [
                        {
                            "name": "service_name",
                            "queryName": "",
                            "isValueColumn": false
                        },
                        {
                            "name": "p99",
                            "queryName": "",
                            "isValueColumn": false
                        },
                        {
                            "name": "error_rate",
                            "queryName": "",
                            "isValueColumn": false
                        },
                        {
                            "name": "throughput",
                            "queryName": "",
                            "isValueColumn": false
                        },
                        {
                            "name": "avg_msg_size",
                            "queryName": "",
                            "isValueColumn": false
                        }
                    ],
                    "rows": [
                        {
                            "data": {
                                "avg_msg_size": "0",
                                "error_rate": "0",
                                "p99": "0.2942205100000016",
                                "service_name": "consumer-svc",
                                "throughput": "0.00016534391534391533"
                            }
                        }
                    ]
                }
            }
        ]
    }
}
```



### 3) Producer Details

API endpoint:

```
POST /api/v1/messaging-queues/kafka/consumer-lag/producer-details
```

```json
{
  "start": 1720685296000000000, 
  "end": 1721290096000000000,
  "variables": {
    "partition": "0", 
    "topic": "topic1"
  }
}
```

response in query range format `series`
```json
{
  "status": "success",
  "data": {
    "resultType": "",
    "result": [
      {
        "table": {
          "columns": [
            {
              "name": "service_name",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "p99_query.p99",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "error_rate",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "rps",
              "queryName": "",
              "isValueColumn": false
            }
          ],
          "rows": [
            {
              "data": {
                "error_rate": "0",
                "p99_query.p99": "150.08830908000002",
                "rps": "0.00016534391534391533",
                "service_name": "producer-svc"
              }
            }
          ]
        }
      }
    ]
  }
}
```
response in query range format `table`
```json
{
  "status": "success",
  "data": {
    "resultType": "",
    "result": [
      {
        "table": {
          "columns": [
            {
              "name": "service_name",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "p99_query.p99",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "error_rate",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "rps",
              "queryName": "",
              "isValueColumn": false
            }
          ],
          "rows": [
            {
              "data": {
                "error_rate": "0",
                "p99_query.p99": "150.08830908000002",
                "rps": "0.00016534391534391533",
                "service_name": "producer-svc"
              }
            }
          ]
        }
      }
    ]
  }
}
```

### 4) Network Fetch Latency:


API endpoint:

```
POST /api/v1/messaging-queues/kafka/consumer-lag/network-latency
```

```json
{
  "start": 1721174400000000000,
  "end": 1722470400000000000,
  "variables": {
    "consumer_group": "cg1"
  }
}
```

response in query range format `series`
```json
{
  "status": "success",
  "data": {
    "resultType": "",
    "result": [
      {
        "table": {
          "columns": [
            {
              "name": "consumer_id",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "instance_id",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "serviceName",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "throughput",
              "queryName": "throughput",
              "isValueColumn": true
            }
          ],
          "rows": [
            {
              "data": {
                "consumer_id": "consumer-cg1-1",
                "instance_id": "e33ffd7c-827a-427a-828e-547e00cb80d8",
                "serviceName": "consumer-svc",
                "throughput": 0.00035
              }
            },
            {
              "data": {
                "consumer_id": "consumer-cg1-1",
                "instance_id": "a96ff029-6f14-435a-a3d4-ab4742b4347f",
                "serviceName": "consumer-svc",
                "throughput": 0.00027
              }
            },
            {
              "data": {
                "consumer_id": "consumer-cg1-1",
                "instance_id": "ac4833a8-fbe1-4592-a0ff-241f46a0851d",
                "serviceName": "consumer-svc-2",
                "throughput": 0.00019
              }
            },
            {
              "data": {
                "consumer_id": "consumer-cg1-1",
                "instance_id": "9e87227f-a564-4b55-bf7c-fb00365d9400",
                "serviceName": "consumer-svc",
                "throughput": 0.00008
              }
            }
          ]
        }
      },
      {
        "table": {
          "columns": [
            {
              "name": "service_name",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "service_instance_id",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "latency_0",
              "queryName": "latency_0",
              "isValueColumn": true
            },
            {
              "name": "latency_1",
              "queryName": "latency_1",
              "isValueColumn": true
            },
            {
              "name": "latency_2",
              "queryName": "latency_2",
              "isValueColumn": true
            },
            {
              "name": "latency_3",
              "queryName": "latency_3",
              "isValueColumn": true
            }
          ],
          "rows": [
            {
              "data": {
                "latency_0": 3230.1,
                "latency_1": "n/a",
                "latency_2": "n/a",
                "latency_3": "n/a",
                "service_instance_id": "a96ff029-6f14-435a-a3d4-ab4742b4347f",
                "service_name": "consumer-svc"
              }
            },
            {
              "data": {
                "latency_0": 503,
                "latency_1": "n/a",
                "latency_2": "n/a",
                "latency_3": "n/a",
                "service_instance_id": "e33ffd7c-827a-427a-828e-547e00cb80d8",
                "service_name": "consumer-svc"
              }
            },
            {
              "data": {
                "latency_0": 502.62,
                "latency_1": "n/a",
                "latency_2": "n/a",
                "latency_3": "n/a",
                "service_instance_id": "9e87227f-a564-4b55-bf7c-fb00365d9400",
                "service_name": "consumer-svc"
              }
            },
            {
              "data": {
                "latency_0": "n/a",
                "latency_1": 3230.1,
                "latency_2": "n/a",
                "latency_3": "n/a",
                "service_instance_id": "a96ff029-6f14-435a-a3d4-ab4742b4347f",
                "service_name": "consumer-svc"
              }
            },
            {
              "data": {
                "latency_0": "n/a",
                "latency_1": 503,
                "latency_2": "n/a",
                "latency_3": "n/a",
                "service_instance_id": "e33ffd7c-827a-427a-828e-547e00cb80d8",
                "service_name": "consumer-svc"
              }
            },
            {
              "data": {
                "latency_0": "n/a",
                "latency_1": 502.62,
                "latency_2": "n/a",
                "latency_3": "n/a",
                "service_instance_id": "9e87227f-a564-4b55-bf7c-fb00365d9400",
                "service_name": "consumer-svc"
              }
            },
            {
              "data": {
                "latency_0": "n/a",
                "latency_1": "n/a",
                "latency_2": 502.81,
                "latency_3": "n/a",
                "service_instance_id": "ac4833a8-fbe1-4592-a0ff-241f46a0851d",
                "service_name": "consumer-svc-2"
              }
            },
            {
              "data": {
                "latency_0": "n/a",
                "latency_1": "n/a",
                "latency_2": "n/a",
                "latency_3": 3230.1,
                "service_instance_id": "a96ff029-6f14-435a-a3d4-ab4742b4347f",
                "service_name": "consumer-svc"
              }
            },
            {
              "data": {
                "latency_0": "n/a",
                "latency_1": "n/a",
                "latency_2": "n/a",
                "latency_3": 503,
                "service_instance_id": "e33ffd7c-827a-427a-828e-547e00cb80d8",
                "service_name": "consumer-svc"
              }
            },
            {
              "data": {
                "latency_0": "n/a",
                "latency_1": "n/a",
                "latency_2": "n/a",
                "latency_3": 502.62,
                "service_instance_id": "9e87227f-a564-4b55-bf7c-fb00365d9400",
                "service_name": "consumer-svc"
              }
            }
          ]
        }
      }
    ]
  }
}
```
