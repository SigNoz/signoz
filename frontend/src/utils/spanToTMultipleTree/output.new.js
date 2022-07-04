const outputNew = {
	"fe3a5bcd7d375797": {
		"id": "fe3a5bcd7d375797",
		"references": [],
		"children": [
			{
				"id": "e8d111b4e4eadc3e",
				"name": "test.test/Method",
				"value": 69004555,
				"time": 69004555,
				"startTime": 1654156152199,
				"tags": [],
				"children": [],
				"serviceName": "NoWorry",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "e06dcad34f81cf6604ebe9886468692c",
						"SpanId": "fe3a5bcd7d375797",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	},
	"da50a1af97e71f51": {
		"id": "da50a1af97e71f51",
		"references": [],
		"children": [
			{
				"id": "b5fb52e3227b6e66",
				"name": "test.Test/Method2",
				"value": 1096433808,
				"time": 1096433808,
				"startTime": 1654156152274,
				"tags": [],
				"children": [],
				"serviceName": "NoWorry",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "e06dcad34f81cf6604ebe9886468692c",
						"SpanId": "da50a1af97e71f51",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	},
	"ad943524bdca4d70": {
		"id": "ad943524bdca4d70",
		"references": [],
		"children": [
			{
				"id": "fdbbeb15b18f2232",
				"name": "test.Test/Method3",
				"value": 5749046,
				"time": 5749046,
				"startTime": 1654156153380,
				"tags": [],
				"children": [],
				"serviceName": "NoWorry",
				"hasError": true,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "e06dcad34f81cf6604ebe9886468692c",
						"SpanId": "ad943524bdca4d70",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	},
	"1000c0df70a30515": {
		"id": "1000c0df70a30515",
		"references": [],
		"children": [
			{
				"id": "c251d06776a62222",
				"name": "user.Users/GetUser",
				"value": 3560708,
				"time": 3560708,
				"startTime": 1654156153372,
				"tags": [],
				"children": [
					{
						"id": "84dbffe0ff5256e9",
						"name": "get",
						"value": 842853,
						"time": 842853,
						"startTime": 1654156153372,
						"tags": [],
						"children": [],
						"serviceName": "user",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "e06dcad34f81cf6604ebe9886468692c",
								"SpanId": "c251d06776a62222",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					},
					{
						"id": "55e773530c7d98f8",
						"name": "gorm.Query",
						"value": 2604472,
						"time": 2604472,
						"startTime": 1654156153373,
						"tags": [],
						"children": [],
						"serviceName": "user",
						"hasError": true,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "e06dcad34f81cf6604ebe9886468692c",
								"SpanId": "c251d06776a62222",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "user",
				"hasError": true,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "e06dcad34f81cf6604ebe9886468692c",
						"SpanId": "1000c0df70a30515",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	},
	"d7287b4b83bcf2ac": {
		"id": "d7287b4b83bcf2ac",
		"references": [],
		"children": [
			{
				"id": "1bcaaebcf41c94c3",
				"name": "user.Users/GetUser",
				"value": 6813421,
				"time": 6813421,
				"startTime": 1654156153397,
				"tags": [],
				"children": [
					{
						"id": "99ba1f6bd105a30b",
						"name": "get",
						"value": 240653,
						"time": 240653,
						"startTime": 1654156153397,
						"tags": [],
						"children": [],
						"serviceName": "user",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "e06dcad34f81cf6604ebe9886468692c",
								"SpanId": "1bcaaebcf41c94c3",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					},
					{
						"id": "ff6d0a243c4f0a8d",
						"name": "gorm.Query",
						"value": 6473815,
						"time": 6473815,
						"startTime": 1654156153398,
						"tags": [],
						"children": [],
						"serviceName": "user",
						"hasError": true,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "e06dcad34f81cf6604ebe9886468692c",
								"SpanId": "1bcaaebcf41c94c3",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "user",
				"hasError": true,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "e06dcad34f81cf6604ebe9886468692c",
						"SpanId": "d7287b4b83bcf2ac",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	},
	"70c2512f85f278c6": {
		"id": "70c2512f85f278c6",
		"references": [],
		"children": [
			{
				"id": "ab7e9bf5ab06711b",
				"name": "user.Users/GetUser",
				"value": 3252570,
				"time": 3252570,
				"startTime": 1654156153376,
				"tags": [],
				"children": [
					{
						"id": "b880d1787d60733d",
						"name": "get",
						"value": 530808,
						"time": 530808,
						"startTime": 1654156153376,
						"tags": [],
						"children": [],
						"serviceName": "user",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "e06dcad34f81cf6604ebe9886468692c",
								"SpanId": "ab7e9bf5ab06711b",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					},
					{
						"id": "1bd11c068a6efedf",
						"name": "gorm.Query",
						"value": 2610299,
						"time": 2610299,
						"startTime": 1654156153377,
						"tags": [],
						"children": [],
						"serviceName": "user",
						"hasError": true,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "e06dcad34f81cf6604ebe9886468692c",
								"SpanId": "ab7e9bf5ab06711b",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "user",
				"hasError": true,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "e06dcad34f81cf6604ebe9886468692c",
						"SpanId": "70c2512f85f278c6",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	},
	"034a729b5f02e57c": {
		"id": "034a729b5f02e57c",
		"references": [],
		"children": [
			{
				"id": "f10fd9d14fb300a1",
				"name": "test.Test/Method4",
				"value": 23997614,
				"time": 23997614,
				"startTime": 1654156153431,
				"tags": [],
				"children": [
					{
						"id": "13780bc8cebb9998",
						"name": "Test.Test/GetTestById",
						"value": 3316291,
						"time": 3316291,
						"startTime": 1654156153431,
						"tags": [],
						"children": [],
						"serviceName": "user",
						"hasError": false,
						"serviceColour": "",
						"event": [],
						"references": [
							{
								"TraceId": "e06dcad34f81cf6604ebe9886468692c",
								"SpanId": "f10fd9d14fb300a1",
								"RefType": "CHILD_OF"
							}
						],
						"isProcessed": true
					}
				],
				"serviceName": "user",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "e06dcad34f81cf6604ebe9886468692c",
						"SpanId": "034a729b5f02e57c",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	},
	"968e7028a2fcf803": {
		"id": "968e7028a2fcf803",
		"references": [],
		"children": [
			{
				"id": "89d673bd765af8e5",
				"name": "test.Test/BlockExistingNoWorryFTestUpdates",
				"value": 8951139,
				"time": 8951139,
				"startTime": 1654156153387,
				"tags": [],
				"children": [],
				"serviceName": "NoWorry",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "e06dcad34f81cf6604ebe9886468692c",
						"SpanId": "968e7028a2fcf803",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	},
	"d45ea5c5fc8516aa": {
		"id": "d45ea5c5fc8516aa",
		"references": [],
		"children": [
			{
				"id": "6d615c96680ad0c5",
				"name": "test.Test/Method12",
				"value": 10537034,
				"time": 10537034,
				"startTime": 1654156153457,
				"tags": [],
				"children": [],
				"serviceName": "NoWorry",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "e06dcad34f81cf6604ebe9886468692c",
						"SpanId": "d45ea5c5fc8516aa",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	},
	"676527986e96952b": {
		"id": "676527986e96952b",
		"references": [],
		"children": [
			{
				"id": "07005731735e2915",
				"name": "Test.Test/CreateTest",
				"value": 8280013,
				"time": 8280013,
				"startTime": 1654156153422,
				"tags": [],
				"children": [],
				"serviceName": "Test",
				"hasError": false,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "e06dcad34f81cf6604ebe9886468692c",
						"SpanId": "676527986e96952b",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	},
	"3657a4b4a6ba443c": {
		"id": "3657a4b4a6ba443c",
		"references": [],
		"children": [
			{
				"id": "7ee2425d1c4ebc91",
				"name": "test.Test/Method56",
				"value": 3431973,
				"time": 3431973,
				"startTime": 1654156153776,
				"tags": [],
				"children": [],
				"serviceName": "waitlist",
				"hasError": true,
				"serviceColour": "",
				"event": [],
				"references": [
					{
						"TraceId": "e06dcad34f81cf6604ebe9886468692c",
						"SpanId": "3657a4b4a6ba443c",
						"RefType": "CHILD_OF"
					}
				],
				"isProcessed": true
			}
		]
	}
}
