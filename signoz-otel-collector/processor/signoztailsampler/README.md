# Signoz Tail Sampler

This sampler is re-write of tail sampler from open-telemetry-contrib. The primary reason for re-write is to support hierachy of policies and priority based evaluation. 

Although this has several elements common to upstream tail sampling processor, the policy structure significantly differs. Hence, this processor is not useful unless you want to support evaluation of a group of policies based on their priorities.

The upstream tail sampler has a different evaluation pattern. It always evaluates all the policies and takes a collaborative decision based on results of those policies. No Priorities are considered. Here we changed that. 

Typically we want to support policies in the following format:

```
Policy 1 (root)
  - Priority: 1 
  - Filter: (Source: Audit)
  - Default Sampling Rate: 50
  - Sub-Policy 1:
    - priority: 1
    - Filter: (threat: true)
    - Sampling Rate: 100
  - Sub-policy 2:
    - priority: 2
    - Filter: (log: true)
    - Sampling Rate: 0

Policy 2 (root):
  - Priority: 2
  - Filter: (serviceName: auth)
  - Default Sampling Rate: 100
  - Sub-Policy 1:
    - priority: 1
    - Filter: (statusCode: 400 or statusCode: 200 )
    - Sampling Rate: 5
```

In above setup, we want to evaluate policies in order of priority. The policies are evaluated in depth-first pattern. This means if a root policy filter evaluates to true, we scan the sub-policies one at a time. If sub-policy evaluates to true we pick the sampling config from that it, if none of the sub-policies match but except root then we pick the sampling config from the root policy.

If root policy fitler does not evaluate to true, we move to the next policy. 

At the end of evaluation if none of the policies match, then we sample by default. 
  
