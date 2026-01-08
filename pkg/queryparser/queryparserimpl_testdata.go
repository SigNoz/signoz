package queryparser

var (
	builderQueryWithGrouping = `
	[
	    {
	      "type":"builder_query",
	      "spec":{
	        "name":"A",
	        "signal":"metrics",
	        "stepInterval":null,
	        "disabled":false,
	        "filter":{"expression":""},
	        "groupBy":[
	          {"name":"service_name","fieldDataType":"","fieldContext":""},
	          {"name":"env","fieldDataType":"","fieldContext":""}
	        ],
	        "aggregations":[
	          {"metricName":"test_metric_cardinality","timeAggregation":"count","spaceAggregation":"sum"},
	          {"metricName":"cpu_usage_total","timeAggregation":"avg","spaceAggregation":"avg"}
	        ]
	      }
	    }
	  ]
	`

	builderQuerySingleGrouping = `
	[
	    {
	      "type":"builder_query",
	      "spec":{
	        "name":"B",
	        "signal":"metrics",
	        "stepInterval":null,
	        "disabled":false,
	        "groupBy":[
	          {"name":"namespace","fieldDataType":"","fieldContext":""}
	        ],
	        "aggregations":[
	          {"metricName":"latency_p50","timeAggregation":"avg","spaceAggregation":"max"}
	        ]
	      }
	    }
	  ]
	`

	builderQueryNoGrouping = `
	[
	    {
	      "type":"builder_query",
	      "spec":{
	        "name":"C",
	        "signal":"metrics",
	        "stepInterval":null,
	        "disabled":false,
	        "groupBy":[],
	        "aggregations":[
	          {"metricName":"disk_usage_total","timeAggregation":"sum","spaceAggregation":"sum"}
	        ]
	      }
	    }
	  ]
	`

	promQueryWithGrouping = `
	[
	    {
	      "type":"promql",
	      "spec":{
	        "name":"P1",
	        "query":"sum by (pod,region) (rate(http_requests_total[5m]))",
	        "disabled":false,
	        "step":0,
	        "stats":false
	      }
	    }
	  ]
	`

	promQuerySingleGrouping = `
	[
	    {
	      "type":"promql",
	      "spec":{
	        "name":"P2",
	        "query":"sum by (env)(rate(cpu_usage_seconds_total{job=\"api\"}[5m]))",
	        "disabled":false,
	        "step":0,
	        "stats":false
	      }
	    }
	  ]
	`

	promQueryNoGrouping = `
	[
	    {
	      "type":"promql",
	      "spec":{
	        "name":"P3",
	        "query":"rate(node_cpu_seconds_total[1m])",
	        "disabled":false,
	        "step":0,
	        "stats":false
	      }
	    }
	  ]
	`

	clickHouseQueryWithGrouping = `
[
    {
      "type":"clickhouse_sql",
      "spec":{
        "name":"CH1",
        "query":"SELECT region as r, zone FROM metrics WHERE metric_name='cpu' GROUP BY region, zone",
        "disabled":false
      }
    }
  ]
`

	clickHouseQuerySingleGrouping = `
[
    {
      "type":"clickhouse_sql",
      "spec":{
        "name":"CH2",
        "query":"SELECT region as r FROM metrics WHERE metric_name='cpu_usage' GROUP BY region",
        "disabled":false
      }
    }
  ]
`

	clickHouseQueryNoGrouping = `
	[
	    {
	      "type":"clickhouse_sql",
	      "spec":{
	        "name":"CH3",
	        "query":"SELECT * FROM metrics WHERE metric_name = 'memory_usage'",
	        "disabled":false
	      }
	    }
	  ]
	`

	builderQueryWithFormula = `
	[
	    {
	      "type":"builder_query",
	      "spec":{
	        "name":"A",
	        "signal":"metrics",
	        "stepInterval":null,
	        "disabled":false,
	        "groupBy":[],
	        "aggregations":[
	          {"metricName":"cpu_usage","timeAggregation":"avg","spaceAggregation":"sum"}
	        ]
	      }
	    },
	    {
	      "type":"builder_query",
	      "spec":{
	        "name":"B",
	        "signal":"metrics",
	        "stepInterval":null,
	        "disabled":false,
	        "groupBy":[],
	        "aggregations":[
	          {"metricName":"mem_usage","timeAggregation":"avg","spaceAggregation":"sum"}
	        ]
	      }
	    },
	    {
	      "type":"builder_formula",
	      "spec":{
	        "name":"F1",
	        "expression":"A + B"
	      }
	    }
	  ]
	`

	builderQueryWithFormulaAndGroupBy = `
	[
	    {
	      "type":"builder_query",
	      "spec":{
	        "name":"A",
	        "signal":"metrics",
	        "stepInterval":null,
	        "disabled":false,
	        "groupBy":[
	          {"name":"host","fieldDataType":"","fieldContext":""},
			  {"name":"region","fieldDataType":"","fieldContext":""}
	        ],
	        "aggregations":[
	          {"metricName":"cpu","timeAggregation":"avg","spaceAggregation":"sum"}
	        ]
	      }
	    },
	    {
	      "type":"builder_query",
	      "spec":{
	        "name":"B",
	        "signal":"metrics",
	        "stepInterval":null,
	        "disabled":false,
	        "groupBy":[
	          {"name":"host","fieldDataType":"","fieldContext":""},
			  {"name":"instance","fieldDataType":"","fieldContext":""}
	        ],
	        "aggregations":[
	          {"metricName":"mem","timeAggregation":"avg","spaceAggregation":"sum"}
	        ]
	      }
	    },
	    {
	      "type":"builder_formula",
	      "spec":{
	        "name":"F1",
	        "expression":"A + B"
	      }
	    }
	  ]
	`

	builderQueryWithFormulaSameQuery = `
	[
	    {
	      "type":"builder_query",
	      "spec":{
	        "name":"A",
	        "signal":"metrics",
	        "stepInterval":null,
	        "disabled":false,
	        "groupBy":[],
	        "aggregations":[
	          {"metricName":"disk_used","timeAggregation":"sum","spaceAggregation":"sum"}
	        ]
	      }
	    },
	    {
	      "type":"builder_formula",
	      "spec":{
	        "name":"F1",
	        "expression":"A + A"
	      }
	    }
	  ]
	`
)
