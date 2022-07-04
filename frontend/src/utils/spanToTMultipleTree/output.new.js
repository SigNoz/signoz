const outputNew = {
	"239b2a9c45b2b54d": {
		"id": "239b2a9c45b2b54d",
		"name": "HTTP GET /dispatch",
		"value": 926827000,
		"time": 926827000,
		"startTime": 1656921367073,
		"tags": [],
		"children": [
			{
				"id": "724b3b21b23d123e",
				"name": "HTTP GET: /customer",
				"value": 532156000,
				"time": 532156000,
				"startTime": 1656921367074,
				"tags": [],
				"children": [
					{
						"id": "4d0c68e222df8fc3",
						"name": "HTTP GET",
						"value": 532075000,
						"time": 532075000,
						"startTime": 1656921367074,
						"tags": [],
						"children": [
							{
								"id": "45c5db7ca45cb1e7",
								"name": "HTTP GET /customer",
								"value": 531765000,
								"time": 531765000,
								"startTime": 1656921367074,
								"tags": [],
								"children": [
									{
										"id": "5a60d939830acfa0",
										"name": "SQL SELECT",
										"value": 531562000,
										"time": 531562000,
										"startTime": 1656921367074,
										"tags": [],
										"children": [],
										"serviceName": "mysql",
										"hasError": false,
										"serviceColour": "",
										"event": [],
										"references": [
											{
												"TraceId": "0000000000000000239b2a9c45b2b54d",
												"SpanId": "45c5db7ca45cb1e7",
												"RefType": "CHILD_OF"
											}
										],
										"isProcessed": true
									}
								],
								"serviceName": "customer",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "4d0c68e222df8fc3",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "frontend",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "724b3b21b23d123e",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			},
			{
				"id": "536248fc0c97b536",
				"name": "/driver.DriverService/FindNearest",
				"value": 201323000,
				"time": 201323000,
				"startTime": 1656921367606,
				"tags": [],
				"children": [
					{
						"id": "5a9ee2152416ac84",
						"name": "/driver.DriverService/FindNearest",
						"value": 198777000,
						"time": 198777000,
						"startTime": 1656921367606,
						"tags": [],
						"children": [
							{
								"id": "3deff1c7835737b9",
								"name": "FindDriverIDs",
								"value": 13408000,
								"time": 13408000,
								"startTime": 1656921367606,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "0364f5d28c72f91f",
								"name": "GetDriver",
								"value": 29241000,
								"time": 29241000,
								"startTime": 1656921367620,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": true,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "47f3875533ccd7e7",
								"name": "GetDriver",
								"value": 9391000,
								"time": 9391000,
								"startTime": 1656921367649,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "7713df011b3d8e86",
								"name": "GetDriver",
								"value": 10262000,
								"time": 10262000,
								"startTime": 1656921367658,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "281b4ac246757a1f",
								"name": "GetDriver",
								"value": 9441000,
								"time": 9441000,
								"startTime": 1656921367669,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "0848eb4bef0072d4",
								"name": "GetDriver",
								"value": 11751000,
								"time": 11751000,
								"startTime": 1656921367678,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "48121ba2d8b6c24b",
								"name": "GetDriver",
								"value": 27390000,
								"time": 27390000,
								"startTime": 1656921367690,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": true,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "39ecbd66d719496f",
								"name": "GetDriver",
								"value": 7186000,
								"time": 7186000,
								"startTime": 1656921367717,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "3b0d13935460368c",
								"name": "GetDriver",
								"value": 7184000,
								"time": 7184000,
								"startTime": 1656921367724,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "3018e5d944177c69",
								"name": "GetDriver",
								"value": 10169000,
								"time": 10169000,
								"startTime": 1656921367732,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "0dfe333824d4005e",
								"name": "GetDriver",
								"value": 14195000,
								"time": 14195000,
								"startTime": 1656921367742,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "6dbcf6e747cd87e2",
								"name": "GetDriver",
								"value": 32429000,
								"time": 32429000,
								"startTime": 1656921367756,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": true,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "035ac2a4b6a334b7",
								"name": "GetDriver",
								"value": 5286000,
								"time": 5286000,
								"startTime": 1656921367788,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							},
							{
								"id": "16df0aa95e6353ee",
								"name": "GetDriver",
								"value": 11123000,
								"time": 11123000,
								"startTime": 1656921367794,
								"tags": [],
								"children": [],
								"serviceName": "redis",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5a9ee2152416ac84",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "driver",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "536248fc0c97b536",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			},
			{
				"id": "1c77e15e17fb8b6e",
				"name": "HTTP GET: /route",
				"value": 40316000,
				"time": 40316000,
				"startTime": 1656921367808,
				"tags": [],
				"children": [
					{
						"id": "7fbd001581bca1d1",
						"name": "HTTP GET",
						"value": 40273000,
						"time": 40273000,
						"startTime": 1656921367808,
						"tags": [],
						"children": [
							{
								"id": "525be28f955aeef5",
								"name": "HTTP GET /route",
								"value": 39501000,
								"time": 39501000,
								"startTime": 1656921367808,
								"tags": [],
								"children": [],
								"serviceName": "route",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "7fbd001581bca1d1",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "frontend",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "1c77e15e17fb8b6e",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			},
			{
				"id": "3d49614e6ae093f7",
				"name": "HTTP GET: /route",
				"value": 70482000,
				"time": 70482000,
				"startTime": 1656921367808,
				"tags": [],
				"children": [
					{
						"id": "1d408ef332bfbacf",
						"name": "HTTP GET",
						"value": 70467000,
						"time": 70467000,
						"startTime": 1656921367808,
						"tags": [],
						"children": [
							{
								"id": "01c6c6a59d9a47d1",
								"name": "HTTP GET /route",
								"value": 69806000,
								"time": 69806000,
								"startTime": 1656921367808,
								"tags": [],
								"children": [],
								"serviceName": "route",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "1d408ef332bfbacf",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "frontend",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "3d49614e6ae093f7",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			},
			{
				"id": "19276008ef736ee5",
				"name": "HTTP GET: /route",
				"value": 74067000,
				"time": 74067000,
				"startTime": 1656921367808,
				"tags": [],
				"children": [
					{
						"id": "64971b252196e585",
						"name": "HTTP GET",
						"value": 74055000,
						"time": 74055000,
						"startTime": 1656921367808,
						"tags": [],
						"children": [
							{
								"id": "36c13fae677009fb",
								"name": "HTTP GET /route",
								"value": 73000000,
								"time": 73000000,
								"startTime": 1656921367808,
								"tags": [],
								"children": [],
								"serviceName": "route",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "64971b252196e585",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "frontend",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "19276008ef736ee5",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			},
			{
				"id": "7d6737b47f64b219",
				"name": "HTTP GET: /route",
				"value": 60738000,
				"time": 60738000,
				"startTime": 1656921367848,
				"tags": [],
				"children": [
					{
						"id": "5b519f21d5bf4d0d",
						"name": "HTTP GET",
						"value": 60729000,
						"time": 60729000,
						"startTime": 1656921367848,
						"tags": [],
						"children": [
							{
								"id": "78de1055629242c1",
								"name": "HTTP GET /route",
								"value": 60243000,
								"time": 60243000,
								"startTime": 1656921367848,
								"tags": [],
								"children": [],
								"serviceName": "route",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5b519f21d5bf4d0d",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "frontend",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "7d6737b47f64b219",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			},
			{
				"id": "7d25e6cdf1a7ea4f",
				"name": "HTTP GET: /route",
				"value": 47436000,
				"time": 47436000,
				"startTime": 1656921367878,
				"tags": [],
				"children": [
					{
						"id": "74d4f654c469ee1e",
						"name": "HTTP GET",
						"value": 47427000,
						"time": 47427000,
						"startTime": 1656921367878,
						"tags": [],
						"children": [
							{
								"id": "00fa5e654b4e95de",
								"name": "HTTP GET /route",
								"value": 47213000,
								"time": 47213000,
								"startTime": 1656921367878,
								"tags": [],
								"children": [],
								"serviceName": "route",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "74d4f654c469ee1e",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "frontend",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "7d25e6cdf1a7ea4f",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			},
			{
				"id": "2b5a02a98bd1378f",
				"name": "HTTP GET: /route",
				"value": 65358000,
				"time": 65358000,
				"startTime": 1656921367882,
				"tags": [],
				"children": [
					{
						"id": "5f96b83d171b3f97",
						"name": "HTTP GET",
						"value": 65352000,
						"time": 65352000,
						"startTime": 1656921367882,
						"tags": [],
						"children": [
							{
								"id": "3d8a0dcd55501fb9",
								"name": "HTTP GET /route",
								"value": 64994000,
								"time": 64994000,
								"startTime": 1656921367882,
								"tags": [],
								"children": [],
								"serviceName": "route",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "5f96b83d171b3f97",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "frontend",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "2b5a02a98bd1378f",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			},
			{
				"id": "5e2179b27993e13d",
				"name": "HTTP GET: /route",
				"value": 58769000,
				"time": 58769000,
				"startTime": 1656921367909,
				"tags": [],
				"children": [
					{
						"id": "3768daad3211e538",
						"name": "HTTP GET",
						"value": 58761000,
						"time": 58761000,
						"startTime": 1656921367909,
						"tags": [],
						"children": [
							{
								"id": "0d17598253b1d881",
								"name": "HTTP GET /route",
								"value": 58473000,
								"time": 58473000,
								"startTime": 1656921367909,
								"tags": [],
								"children": [],
								"serviceName": "route",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "3768daad3211e538",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "frontend",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "5e2179b27993e13d",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			},
			{
				"id": "375814fe5e872d11",
				"name": "HTTP GET: /route",
				"value": 48240000,
				"time": 48240000,
				"startTime": 1656921367947,
				"tags": [],
				"children": [
					{
						"id": "307ff380b7c29993",
						"name": "HTTP GET",
						"value": 48231000,
						"time": 48231000,
						"startTime": 1656921367947,
						"tags": [],
						"children": [
							{
								"id": "2285830b2b5403e2",
								"name": "HTTP GET /route",
								"value": 47944000,
								"time": 47944000,
								"startTime": 1656921367947,
								"tags": [],
								"children": [],
								"serviceName": "route",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "307ff380b7c29993",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "frontend",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "375814fe5e872d11",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			},
			{
				"id": "10a40a06fe7b4df4",
				"name": "HTTP GET: /route",
				"value": 30086000,
				"time": 30086000,
				"startTime": 1656921367968,
				"tags": [],
				"children": [
					{
						"id": "08d3532ab7090cd3",
						"name": "HTTP GET",
						"value": 30079000,
						"time": 30079000,
						"startTime": 1656921367968,
						"tags": [],
						"children": [
							{
								"id": "6009d0526e916c07",
								"name": "HTTP GET /route",
								"value": 29750000,
								"time": 29750000,
								"startTime": 1656921367968,
								"tags": [],
								"children": [],
								"serviceName": "route",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "08d3532ab7090cd3",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "frontend",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "10a40a06fe7b4df4",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			},
			{
				"id": "323356a7ac1083f4",
				"name": "HTTP GET: /route",
				"value": 74607000,
				"time": 74607000,
				"startTime": 1656921367926,
				"tags": [],
				"children": [
					{
						"id": "42a39fa416fea739",
						"name": "HTTP GET",
						"value": 74599000,
						"time": 74599000,
						"startTime": 1656921367926,
						"tags": [],
						"children": [
							{
								"id": "3442bcdcddfb479f",
								"name": "HTTP GET /route",
								"value": 74340000,
								"time": 74340000,
								"startTime": 1656921367926,
								"tags": [],
								"children": [],
								"serviceName": "route",
								"hasError": false,
								"serviceColour": "",
								"event": [],
								"references": [
									{
										"TraceId": "0000000000000000239b2a9c45b2b54d",
										"SpanId": "42a39fa416fea739",
										"RefType": "CHILD_OF"
									}
								],
								"isProcessed": true
							}
						],
						"serviceName": "frontend",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "0000000000000000239b2a9c45b2b54d",
								"SpanId": "323356a7ac1083f4",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "frontend",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "239b2a9c45b2b54d",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		],
		"serviceName": "frontend",
		"hasError": false,
		"serviceColour": "",
		"event": [],
		"references": [
			{
				"TraceId": "0000000000000000239b2a9c45b2b54d",
				"SpanId": "",
				"RefType": "CHILD_OF"
			}
		]
	},
	"parentNotFound": {
		"id": "parentNotFound",
		"references": [],
		"children": [
			{
				"id": "unparentedSpan",
				"name": "GetDriver",
				"value": 11123000,
				"time": 11123000,
				"startTime": 1656921367794,
				"tags": [],
				"children": [],
				"serviceName": "redis",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "0000000000000000239b2a9c45b2b54d",
						"SpanId": "parentNotFound",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	}
}
