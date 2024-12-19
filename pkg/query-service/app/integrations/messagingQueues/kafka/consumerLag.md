## Consumer Lag feature break down

### 1) Consumer Group Details

API endpoint:

```
POST /api/v1/messaging-queues/kafka/consumer-lag/consumer-details
```

Request-Body
```json
{
  "start": 1724429217000000000,
  "end": 1724431017000000000,
  "variables": {
    "partition": "0",
    "topic": "topic1",
    "consumer_group": "cg1"
  }
}
```
Response in query range `table` format
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
                "avg_msg_size": "15",
                "error_rate": "0",
                "p99": "0.47993265000000035",
                "service_name": "consumer-svc",
                "throughput": "39.86888888888889"
              }
            }
          ]
        }
      }
    ]
  }
}
```

----

### 2) Producer Details

API endpoint:

```
POST /api/v1/messaging-queues/kafka/consumer-lag/producer-details
```

Request-Body
```json
{
  "start": 1724429217000000000,
  "end": 1724431017000000000,
  "variables": {
    "partition": "0",
    "topic": "topic1"
  }
}
```

Response in query range `table` format
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
              "name": "error_percentage",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "throughput",
              "queryName": "",
              "isValueColumn": false
            }
          ],
          "rows": [
            {
              "data": {
                "error_percentage": "0",
                "p99": "5.51359028",
                "throughput": "39.86888888888889",
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

### 3) Network Fetch Latency:

API endpoint:

```
POST /api/v1/messaging-queues/kafka/consumer-lag/network-latency
```

Request-Body
```json
{
  "start": 1724673937000000000,
  "end": 1724675737000000000,
  "variables": {
    "consumer_group": "cg1",
    "partition": "0"
  }
}
```

Response in query range `table` format
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
              "name": "client_id",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "service_instance_id",
              "queryName": "",
              "isValueColumn": false
            },
            {
              "name": "latency",
              "queryName": "latency",
              "isValueColumn": true
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
                "client_id": "consumer-cg1-1",
                "latency": 48.99,
                "service_instance_id": "b0a851d7-1735-4e3f-8f5f-7c63a8a55a24",
                "service_name": "consumer-svc",
                "throughput": 14.97
              }
            },
            {
              "data": {
                "client_id": "consumer-cg1-1",
                "latency": 25.21,
                "service_instance_id": "ccf49550-2e8f-4c7b-be29-b9e0891ef93d",
                "service_name": "consumer-svc",
                "throughput": 24.91
              }
            }
          ]
        }
      }
    ]
  }
}
```

### Onboarding APIs

```
/api/v1/messaging-queues/kafka/onboarding/producers
```

```json
{
    "start": 1727620544260611424,
    "end": 1727620556401481428
}
```

```json
// everything is present
{
    "status": "success",
    "data": [
        {
            "attribute": "kind",
            "error_message": "",
            "status": "1"
        },
        {
            "attribute": "messaging.destination.name",
            "error_message": "",
            "status": "1"
        },
        {
            "attribute": "messaging.destination.partition.id",
            "error_message": "messaging.destination.partition.id attribute is not present in your spans",
            "status": "0"
        },
        {
            "attribute": "messaging.system",
            "error_message": "",
            "status": "1"
        },
        {
            "attribute": "telemetry ingestion",
            "error_message": "",
            "status": "1"
        }
    ]
}

// partial attributes are present
{
    "status": "success",
    "data": [
        {
            "attribute": "kind",
            "error_message": "",
            "status": "1"
        },
        {
            "attribute": "messaging.destination.name",
            "error_message": "messaging.destination.name attribute is not present in your spans",
            "status": "0"
        },
        {
            "attribute": "messaging.destination.partition.id",
            "error_message": "",
            "status": "1"
        },
        {
            "attribute": "messaging.system",
            "error_message": "",
            "status": "1"
        },
        {
            "attribute": "telemetry ingestion",
            "error_message": "",
            "status": "1"
        }
    ]
}

// no data available
{
    "status": "success",
    "data": [
        {
            "attribute": "telemetry ingestion",
            "error_message": "No data available in the given time range",
            "status": "0"
        }
    ]
}
```


```
/api/v1/messaging-queues/kafka/onboarding/consumers
```

```json
// everything is present
{
  "status": "success",
  "data": [
    {
      "attribute": "kind",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "messaging.client_id",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "messaging.destination.name",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "messaging.destination.partition.id",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "messaging.kafka.consumer.group",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "messaging.message.body.size",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "messaging.system",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "service.instance.id",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "service_name",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "telemetry ingestion",
      "error_message": "",
      "status": "1"
    }
  ]
}

// partial attributes are present
{
  "status": "success",
  "data": [
    {
      "attribute": "kind",
      "error_message": "check if your consumer spans has kind=5 as attribute",
      "status": "0"
    },
    {
      "attribute": "messaging.client_id",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "messaging.destination.name",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "messaging.destination.partition.id",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "messaging.kafka.consumer.group",
      "error_message": "messaging.kafka.consumer.group attribute is not present in your spans",
      "status": "0"
    },
    {
      "attribute": "messaging.message.body.size",
      "error_message": "messaging.message.body.size attribute is not present in your spans",
      "status": "0"
    },
    {
      "attribute": "messaging.system",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "service.instance.id",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "service_name",
      "error_message": "",
      "status": "1"
    },
    {
      "attribute": "telemetry ingestion",
      "error_message": "",
      "status": "1"
    }
  ]
}

// no data available
{
  "status": "success",
  "data": [
    {
      "attribute": "telemetry ingestion",
      "error_message": "No data available in the given time range",
      "status": "0"
    }
  ]
}
```

```
/api/v1/messaging-queues/kafka/onboarding/kafka
```

```json
{
    "start": 1728485200000000000,
    "end": 1728749800000000000
}
```

```json
// everything is present
{
    "status": "success",
    "data": [
        {
            "attribute": "telemetry ingestion",
            "error_message": "",
            "status": "1"
        },
        {
            "attribute": "kafka_consumer_fetch_latency_avg",
            "error_message": "Metric kafka_consumer_fetch_latency_avg is not present in the given time range.",
            "status": "0"
        },
        {
            "attribute": "kafka_consumer_group_lag",
            "error_message": "Metric kafka_consumer_group_lag is not present in the given time range.",
            "status": "0"
        }
    ]
}

// partial attributes are present
{
    "status": "success",
    "data": [
        {
            "attribute": "telemetry ingestion",
            "error_message": "",
            "status": "1"
        },
        {
            "attribute": "kafka_consumer_fetch_latency_avg",
            "error_message": "",
            "status": "1"
        },
        {
            "attribute": "kafka_consumer_group_lag",
            "error_message": "",
            "status": "1"
        }
    ]
}

// no data available
{
    "status": "success",
    "data": [
        {
            "attribute": "telemetry ingestion",
            "error_message": "No data available in the given time range",
            "status": "0"
        }
    ]
}
```
### Partition Latency

```json
/api/v1/messaging-queues/kafka/partition-latency/overview
```
```json
{
	"start": 1728287046000000000,
	"end": 1728587046000000000
}
```

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
                            "name": "topic",
                            "queryName": "",
                            "isValueColumn": false
                        },
                        {
                            "name": "p99",
                            "queryName": "",
                            "isValueColumn": false
                        },
                        {
                            "name": "partition_latency",
                            "queryName": "partition_latency",
                            "isValueColumn": true
                        }
                    ],
                    "rows": [
                        {
                            "data": {
                                "p99": "2",
                                "partition_latency": 1.18,
                                "topic": "topic1"
                            }
                        },
                        {
                            "data": {
                                "p99": "2",
                                "partition_latency": 0.15,
                                "topic": "topic2"
                            }
                        },
                        {
                            "data": {
                                "p99": "2",
                                "partition_latency": 0.26,
                                "topic": "topic3"
                            }
                        }
                    ]
                }
            }
        ]
    }
}
```
---------

```json
/api/v1/messaging-queues/kafka/partition-latency/consumer
```
```json
{
	"start": 1728287046000000000,
	"end": 1728587046000000000,
	"variables": {
        "partition": "2",
		"topic": "topic1"
	}
}

```
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
                        }
                    ],
                    "rows": [
                        {
                            "data": {
                                "consumer_group": "cg1",
                                "error_rate": "0",
                                "p99": "0.11994228000000004",
                                "service_name": "consumer-svc",
                                "throughput": "1.18116"
                            }
                        }
                    ]
                }
            }
        ]
    }
}
```
---------
### Topic throughput

```json
/api/v1/messaging-queues/kafka/topic-throughput/producer
```
```json
{
	"start": 1728287046000000000,
	"end": 1728587046000000000
}
```
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
                            "name": "topic",
                            "queryName": "",
                            "isValueColumn": false
                        },
                        {
                            "name": "serviceName",
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
                        }
                    ],
                    "rows": [
                        {
                            "data": {
                                "error_rate": "0",
                                "p99": "8.662880220000002",
                                "serviceName": "producer-svc1",
                                "throughput": "0.41642666666666667",
                                "topic": "topic1"
                            }
                        },
                        {
                            "data": {
                                "error_rate": "0",
                                "p99": "9.786847500000016",
                                "serviceName": "producer-svc2",
                                "throughput": "0.76473",
                                "topic": "topic1"
                            }
                        },
                        {
                            "data": {
                                "error_rate": "0",
                                "p99": "14.432925500000021",
                                "serviceName": "producer-svc3",
                                "throughput": "0.08976",
                                "topic": "topic2"
                            }
                        },
                        {
                            "data": {
                                "error_rate": "0",
                                "p99": "14.32833297000002",
                                "serviceName": "producer-svc2",
                                "throughput": "0.06449333333333333",
                                "topic": "topic2"
                            }
                        },
                        {
                            "data": {
                                "error_rate": "0",
                                "p99": "13.416533810000036",
                                "serviceName": "producer-svc4",
                                "throughput": "0.14766",
                                "topic": "topic3"
                            }
                        },
                        {
                            "data": {
                                "error_rate": "0",
                                "p99": "13.366232000000034",
                                "serviceName": "producer-svc3",
                                "throughput": "0.11166666666666666",
                                "topic": "topic3"
                            }
                        }
                    ]
                }
            }
        ]
    }
}
```
---------
### Topic throughput

```json
/api/v1/messaging-queues/kafka/topic-throughput/producer-details
```
```json
{
	"start": 1728287046000000000,
	"end": 1728587046000000000,
	"variables": {
        "partition": "2",
		"topic": "topic1",
        "service_name": "producer-svc2"
	}
}
```
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
                            "name": "partition",
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
                        }
                    ],
                    "rows": [
                        {
                            "data": {
                                "error_rate": "0",
                                "p99": "9.165558780000026",
                                "partition": "2",
                                "throughput": "0.76473"
                            }
                        }
                    ]
                }
            }
        ]
    }
}
```
---------
### Topic throughput

```json
/api/v1/messaging-queues/kafka/topic-throughput/consumer
```
```json
{
	"start": 1728287046000000000,
	"end": 1728587046000000000
}
```
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
                            "name": "topic",
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
                            "name": "ingestion_rate",
                            "queryName": "",
                            "isValueColumn": false
                        },
                        {
                            "name": "byte_rate",
                            "queryName": "",
                            "isValueColumn": false
                        }
                    ],
                    "rows": [
                        {
                            "data": {
                                "byte_rate": "17.7174",
                                "error_rate": "0",
                                "ingestion_rate": "1.18116",
                                "p99": "0.12260112000000009",
                                "service_name": "consumer-svc",
                                "topic": "topic1"
                            }
                        },
                        {
                            "data": {
                                "byte_rate": "2.1594533333333334",
                                "error_rate": "0",
                                "ingestion_rate": "0.15424666666666667",
                                "p99": "7.4079657800000005",
                                "service_name": "consumer-svc2",
                                "topic": "topic2"
                            }
                        },
                        {
                            "data": {
                                "byte_rate": "3.66446",
                                "error_rate": "0",
                                "ingestion_rate": "0.25933",
                                "p99": "6.135769970000011",
                                "service_name": "consumer-svc3",
                                "topic": "topic3"
                            }
                        }
                    ]
                }
            }
        ]
    }
}
```
---------
### Topic throughput

```json
/api/v1/messaging-queues/kafka/topic-throughput/consumer-details
```
```json
{
	"start": 1728287046000000000,
	"end": 1728587046000000000,
	"variables": {
		"topic": "topic1",
        "service_name": "consumer-svc"
	}
}
```
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
                            "name": "partition",
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
                        }
                    ],
                    "rows": [
                        {
                            "data": {
                                "error_rate": "0",
                                "p99": "0.11789381000000003",
                                "partition": "2",
                                "throughput": "1.18116"
                            }
                        }
                    ]
                }
            }
        ]
    }
}
```
