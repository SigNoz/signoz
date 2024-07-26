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
        "queryName": "producer",
        "series": [
          {
            "labels": {
              "error_rate": "0",
              "p99_query.p99": "150.08830908000002",
              "rps": "0.00016534391534391533",
              "service_name": "producer-svc"
            },
            "labelsArray": [
              {
                "service_name": "producer-svc"
              },
              {
                "p99_query.p99": "150.08830908000002"
              },
              {
                "error_rate": "0"
              },
              {
                "rps": "0.00016534391534391533"
              }
            ],
            "values": []
          }
        ]
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
                            "name": "consumer_group",
                            "queryName": "",
                            "isValueColumn": false
                        },
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
                                "consumer_group": "cg1",
                                "error_rate": "0",
                                "p99": "0.2942205100000016",
                                "service_name": "consumer-svc",
                                "throughput": "0.00016534391534391533"
                            }
                        },
                        {
                            "data": {
                                "avg_msg_size": "0",
                                "consumer_group": "cg3",
                                "error_rate": "0",
                                "p99": "0.216600410000002",
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
POST /api/v1/messaging-queues/kafka/consumer-lag/consumer-details
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

