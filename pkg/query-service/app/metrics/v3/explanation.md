


signoz_metrics.samples_v2

| id  | t      | v(cumulative) | v(delta) |
|-----|--------|-----|-----|
| S1  | 12.00  | 0   | 0   |
| S1  | 12.05  | 12  | 12  | 
| S1  | 12.10  | 14  | 2   |
| S1  | 12.15  | 16  | 2   |
| S1  | 12.20  | 22  | 6   |
| S1  | 12.25  | 25  | 3   |
| S1  | 12.30  | 32  | 7   |
| S1  | 12.35  | 37  | 5   |
| S1  | 12.40  | 45  | 8   |
| S1  | 12.45  | 49  | 4   |
| S1  | 12.50  | 59  | 10  |
| S1  | 12.55  | 66  | 7   | 
| S2  | 12.00  | 0   | 0   |
| S2  | 12.05  | 15  | 15  | 
| S2  | 12.10  | 17  | 2   |
| S2  | 12.15  | 21  | 4   |
| S2  | 12.20  | 34  | 13  |
| S2  | 12.25  | 36  | 2   |
| S2  | 12.30  | 45  | 9   |
| S2  | 12.35  | 47  | 2   |
| S2  | 12.40  | 49  | 2   |
| S2  | 12.45  | 51  | 2   |
| S2  | 12.50  | 62  | 11  |
| S2  | 12.55  | 71  | 9   | 

signoz_metrics.time_series_v2

| id  | labels |
|-----|--------|
| S1  | {service_name:frontend, operation:GET} |
| S2  | {service_name:frontend, operation:POST} |


Assume you wanted a request rate for the service frontend.

Here is what we would do for the delta. We join the both the table on the id and then on the result we use sum(value)/duration to get the rate. 

Here is the intermediary result of the join.

| id  | t      | v(cumulative) | v(delta) | labels |
|-----|--------|-----|-----|--------|
| S1  | 12.00  | 0   | 0   | {service_name:frontend, operation:GET} |
| S1  | 12.05  | 12  | 12  | {service_name:frontend, operation:GET} |
| S1  | 12.10  | 14  | 2   | {service_name:frontend, operation:GET} |
| S1  | 12.15  | 16  | 2   | {service_name:frontend, operation:GET} |
| S1  | 12.20  | 22  | 6   | {service_name:frontend, operation:GET} |
| S1  | 12.25  | 25  | 3   | {service_name:frontend, operation:GET} |
| S1  | 12.30  | 32  | 7   | {service_name:frontend, operation:GET} |
| S1  | 12.35  | 37  | 5   | {service_name:frontend, operation:GET} |
| S1  | 12.40  | 45  | 8   | {service_name:frontend, operation:GET} |
| S1  | 12.45  | 49  | 4   | {service_name:frontend, operation:GET} |
| S1  | 12.50  | 59  | 10  | {service_name:frontend, operation:GET} |
| S1  | 12.55  | 66  | 7   | {service_name:frontend, operation:GET} |
| S2  | 12.00  | 0   | 0   | {service_name:frontend, operation:POST} |
| S2  | 12.05  | 15  | 15  | {service_name:frontend, operation:POST} |
| S2  | 12.10  | 17  | 2   | {service_name:frontend, operation:POST} |
| S2  | 12.15  | 21  | 4   | {service_name:frontend, operation:POST} |
| S2  | 12.20  | 34  | 13  | {service_name:frontend, operation:POST} |
| S2  | 12.25  | 36  | 2   | {service_name:frontend, operation:POST} |
| S2  | 12.30  | 45  | 9   | {service_name:frontend, operation:POST} |
| S2  | 12.35  | 47  | 2   | {service_name:frontend, operation:POST} |
| S2  | 12.40  | 49  | 2   | {service_name:frontend, operation:POST} |
| S2  | 12.45  | 51  | 2   | {service_name:frontend, operation:POST} |
| S2  | 12.50  | 62  | 11  | {service_name:frontend, operation:POST} |
| S2  | 12.55  | 71  | 9   | {service_name:frontend, operation:POST} |


For delta we would sum the value column group by the service_name:

| service_name | sum(v)/ duration |
|--------------|------------------|
| frontend     | (12 + 2 + 2 + 6 + 3 + 7 + 5 + 8 + 4 + 10 + 7 + 15 + 2 + 4 + 13 + 2 + 9 + 2 + 2 + 2 + 11 + 9)/ 60 |

For cumulative we would would first need to calculate the rate of change for each series and then sum them up. 

| service_name | t    | runningRate |
|--------------|------|-------------|
| frontend     | 12.05| (12-0)/0.5  |
| frontend     | 12.10| (14-12)/0.5 |
| frontend     | 12.15| (16-14)/0.5 |
| frontend     | 12.20| (22-16)/0.5 |
| frontend     | 12.25| (25-22)/0.5 |
| frontend     | 12.30| (32-25)/0.5 |
| frontend     | 12.35| (37-32)/0.5 |
| frontend     | 12.40| (45-37)/0.5 |
| frontend     | 12.45| (49-45)/0.5 |
| frontend     | 12.50| (59-49)/0.5 |
| frontend     | 12.55| (66-59)/0.5 |
| frontend     | 12.05| (15-0)/0.5  |
| frontend     | 12.10| (17-15)/0.5 |
| frontend     | 12.15| (21-17)/0.5 |
| frontend     | 12.20| (34-21)/0.5 |
| frontend     | 12.25| (36-34)/0.5 |
| frontend     | 12.30| (45-36)/0.5 |
| frontend     | 12.35| (47-45)/0.5 |
| frontend     | 12.40| (49-47)/0.5 |
| frontend     | 12.45| (51-49)/0.5 |
| frontend     | 12.50| (62-51)/0.5 |
| frontend     | 12.55| (71-62)/0.5 |

Now we sum the runningRate column and divide by the duration.

| service_name | sum(runningRate)/ duration |
|--------------|------------------|
| frontend     | (12 + 2 + 2 + 6 + 3 + 7 + 5 + 8 + 4 + 10 + 7 + 15 + 2 + 4 + 13 + 2 + 9 + 2 + 2 + 2 + 11 + 9)/ (5minutes * 10points) |