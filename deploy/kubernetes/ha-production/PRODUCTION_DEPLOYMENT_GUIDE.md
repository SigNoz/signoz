# SigNoz Production HA Deployment Guide

## 🎯 Overview

This guide provides step-by-step instructions for deploying SigNoz in High Availability (HA) mode on Kubernetes with distributed ClickHouse clustering, tested in production environments.

**Architecture Deployed:**
- **SigNoz**: 1 main instance + 3 OTel collectors
- **ClickHouse**: 2 shards × 2 replicas (4 pods total)
- **ZooKeeper**: 3-node quorum for coordination
- **Storage**: 4TB distributed storage with replication
- **Load Balancer**: Application Load Balancer with CloudFront

## 📋 Prerequisites

### Infrastructure Requirements
- **Kubernetes Cluster**: 1.20+ (tested on EKS 1.31)
- **Nodes**: Minimum 3 nodes for proper HA distribution
- **Node Size**: 16GB+ RAM, 4+ vCPUs per node (tested: c5.9xlarge)
- **Storage**: 1TB+ per ClickHouse pod (4TB+ total)
- **Network**: Pod-to-pod communication, load balancer support

### Required Components
- **ClickHouse Operator**: Altinity ClickHouse operator
- **Load Balancer Controller**: AWS Load Balancer Controller (or equivalent)
- **Storage Class**: Dynamic provisioning (gp3 recommended)
- **Ingress Controller**: For external access

### AWS-Specific Requirements
- **IAM Permissions**: EKS cluster management, Load Balancer controller
- **EBS CSI Driver**: For persistent volume provisioning
- **VPC Configuration**: Public/private subnets for load balancer

## 🚀 Deployment Steps

### Step 1: Prepare Kubernetes Cluster

```bash
# Verify cluster is ready
kubectl get nodes
kubectl get storageclass

# Expected: 3+ nodes in Ready state, storage class available
```

### Step 2: Install Required Operators

#### Install ClickHouse Operator
```bash
# Add ClickHouse operator repository
helm repo add clickhouse-operator https://docs.altinity.com/clickhouse-operator/
helm repo update

# Install ClickHouse operator
helm install clickhouse-operator clickhouse-operator/altinity-clickhouse-operator \
  -n kube-system \
  --wait
```

#### Install AWS Load Balancer Controller (AWS EKS)
```bash
# Create IAM service account
eksctl create iamserviceaccount \
  --cluster=your-cluster-name \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess \
  --override-existing-serviceaccounts \
  --approve

# Install Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=your-cluster-name \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### Step 3: Create Namespace and Storage

```bash
# Create SigNoz namespace
kubectl create namespace signoz

# Verify storage class (modify if needed)
kubectl get storageclass gp3
```

### Step 4: Deploy ClickHouse HA Cluster

```bash
# Deploy distributed ClickHouse cluster
kubectl apply -f clickhouse-ha-cluster.yaml

# Verify ClickHouse deployment
kubectl get chi -n signoz
kubectl get pods -n signoz -l app.kubernetes.io/name=clickhouse

# Wait for all ClickHouse pods to be Running (may take 5-10 minutes)
kubectl wait --for=condition=Ready pod -l clickhouse.altinity.com/chi=signoz-clickhouse-ha -n signoz --timeout=600s
```

### Step 5: Verify ClickHouse Cluster Health

```bash
# Check cluster topology (should show 2 shards, 2 replicas each)
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT * FROM system.clusters WHERE cluster = 'prod'"

# Expected output: 4 rows showing shard/replica distribution
```

### Step 6: Deploy SigNoz with HA Configuration

```bash
# Add SigNoz Helm repository
helm repo add signoz https://charts.signoz.io
helm repo update

# Deploy SigNoz with HA configuration
helm install signoz signoz/signoz \
  -n signoz \
  -f signoz-ha-production-values.yaml \
  --wait \
  --timeout=15m
```

### Step 7: Apply Fixed Schema Migration (if needed)

```bash
# Check if default schema migration completed
kubectl get jobs -n signoz | grep schema

# If migration job failed or is stuck, apply fixed version
kubectl delete job signoz-schema-migrator-sync -n signoz --ignore-not-found
kubectl apply -f schema-migration-fixed.yaml

# Wait for migration to complete
kubectl wait --for=condition=complete job/signoz-schema-migrator-fixed -n signoz --timeout=600s
```

### Step 8: Verify Core Deployment

```bash
# Check all pods are running
kubectl get pods -n signoz

# Verify databases were created (should show 5 signoz_* databases)
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SHOW DATABASES"

# Check SigNoz service health
kubectl exec signoz-0 -n signoz -- wget -q -O- http://localhost:8080/api/v1/health
```

### Step 9: Configure External Access

```bash
# Deploy Application Load Balancer ingress
kubectl apply -f signoz-alb-ingress.yaml

# Wait for ALB to be provisioned (may take 3-5 minutes)
kubectl get ingress signoz-alb-ingress -n signoz

# Get ALB hostname
ALB_HOST=$(kubectl get ingress signoz-alb-ingress -n signoz -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "SigNoz URL: http://$ALB_HOST"
```

### Step 10: Deploy Infrastructure Monitoring

```bash
# Deploy hostmetrics collection DaemonSet
kubectl apply -f otel-hostmetrics-daemonset.yaml

# Verify hostmetrics collectors are running on all nodes
kubectl get pods -n signoz -l app=otel-hostmetrics-collector
```

### Step 11: Final Verification

```bash
# Test external access
curl -I http://$ALB_HOST/api/v1/health

# Verify data ingestion is working (wait 2-3 minutes after deployment)
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count(*) FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli > $(date -d '2 minutes ago' +%s)000"

# Should show >0 metrics if hostmetrics are being ingested

# Check logs ingestion
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count(*) FROM signoz_logs.distributed_logs_v2 WHERE timestamp > $(date -d '5 minutes ago' +%s)000000000"
```

## 🔍 Post-Deployment Configuration

### Configure CloudFront (Optional but Recommended)
1. Create CloudFront distribution pointing to ALB
2. Configure custom domain name
3. Set up SSL certificate via ACM
4. Update DNS records

### Set Up Monitoring Dashboards
1. Access SigNoz UI via load balancer URL
2. Configure default dashboard settings  
3. Set up retention policies (recommended: 30 days)
4. Configure alert rules for critical metrics

### Configure Data Retention
```bash
# Access SigNoz UI → Settings → General Settings
# Set retention to desired values (e.g., 30 days for metrics, 7 days for traces)
# Note: This was the original issue - now possible with HA cluster
```

## 📊 Health Monitoring

### Daily Health Checks
```bash
# Overall cluster status
kubectl get pods -n signoz

# ClickHouse cluster health
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT cluster, shard_num, replica_num, host_name FROM system.clusters WHERE cluster = 'prod'"

# Data ingestion rate
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT count(*) FROM signoz_metrics.distributed_samples_v4 WHERE unix_milli > $(date -d '10 minutes ago' +%s)000"

# Storage usage
kubectl get pvc -n signoz
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- df -h /var/lib/clickhouse
```

### Performance Monitoring
```bash
# Query performance
kubectl exec chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz -- \
  clickhouse-client -q "SELECT query, elapsed, memory_usage FROM system.processes WHERE elapsed > 1"

# Resource utilization
kubectl top pods -n signoz
kubectl top nodes
```

## 🛡️ Security Considerations

### Network Security
- Configure security groups/firewall rules
- Restrict ClickHouse port access (9000/TCP) to cluster only
- Use TLS for external access (CloudFront/ACM)

### Access Control
- Configure Kubernetes RBAC policies
- Set up ClickHouse user authentication
- Implement network policies for pod-to-pod communication

### Data Protection
- Enable encryption at rest for EBS volumes
- Configure backup strategies for persistent data
- Implement data retention policies

## 📈 Scaling Considerations

### Vertical Scaling
```bash
# Increase resource allocations in signoz-ha-production-values.yaml
# Apply with Helm upgrade:
helm upgrade signoz signoz/signoz -n signoz -f signoz-ha-production-values.yaml
```

### Horizontal Scaling
```bash
# Scale OTel collectors
kubectl scale deployment signoz-otel-collector -n signoz --replicas=5

# Scale query service (if configured)
kubectl scale deployment signoz-query-service -n signoz --replicas=5
```

### Storage Scaling
```bash
# Expand PVC size (requires gp3 storage class with allowVolumeExpansion)
kubectl patch pvc data-chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz \
  -p '{"spec":{"resources":{"requests":{"storage":"2000Gi"}}}}'

# Restart pod to apply expansion
kubectl delete pod chi-signoz-clickhouse-ha-prod-0-0-0 -n signoz
```

## 🔧 Troubleshooting

### Common Issues

#### Schema Migration Failures
```bash
# Symptoms: 500 errors, missing databases
# Solution: Apply fixed schema migration
kubectl apply -f schema-migration-fixed.yaml
```

#### Data Ingestion Not Working
```bash
# Check OTel collector logs
kubectl logs deployment/signoz-otel-collector -n signoz

# Verify ClickHouse connectivity
kubectl exec signoz-0 -n signoz -- nc -zv clickhouse-signoz-clickhouse-ha 9000
```

#### Pods Stuck in Pending
```bash
# Check node resources and anti-affinity constraints
kubectl describe pod <pod-name> -n signoz
kubectl get nodes -o wide
```

### Emergency Procedures
Refer to `TROUBLESHOOTING_RUNBOOK.md` for detailed emergency procedures.

## 📚 Next Steps

1. **Configure Monitoring**: Set up alerts for cluster health
2. **Implement Backups**: Regular ClickHouse data backups
3. **Performance Tuning**: Optimize based on workload patterns  
4. **Capacity Planning**: Monitor growth and plan scaling
5. **Security Hardening**: Implement additional security measures

## 🎯 Expected Results

After successful deployment:
- **Availability**: 99.9%+ uptime with proper HA configuration
- **Performance**: Sub-second query response times
- **Scalability**: Handle 10,000+ metrics per minute
- **Reliability**: Zero data loss during node failures
- **Operability**: Minimal manual intervention required

**Deployment Time**: 30-45 minutes for complete setup
**Initial Data**: Visible within 5 minutes of deployment

This configuration provides a production-ready, scalable SigNoz deployment that can handle enterprise workloads while maintaining high availability and data integrity.