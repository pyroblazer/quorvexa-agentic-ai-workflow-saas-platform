# Deployment Guide

## Local Deployment (Docker Compose)

### Start everything with one command

```bash
# Copy environment file
cp .env.example .env

# Edit required values (JWT secrets, etc.)
# Minimum required:
# JWT_SECRET=<at-least-32-random-chars>
# JWT_REFRESH_SECRET=<different-32-random-chars>

# Start infrastructure (databases, brokers)
docker compose -f infra/docker/docker-compose.yml up -d postgres redis qdrant kafka zookeeper rabbitmq

# Wait for services to be healthy (~30 seconds)
docker compose -f infra/docker/docker-compose.yml ps

# Start application services
docker compose -f infra/docker/docker-compose.yml --profile services up -d

# View logs
docker compose -f infra/docker/docker-compose.yml logs -f
```

### Start observability stack

```bash
# Create network if not exists
docker network create quorvexa-net 2>/dev/null || true

# Start obs stack
docker compose -f infra/docker/docker-compose.obs.yml up -d

# Access:
# Grafana:       http://localhost:3001 (admin/admin)
# Prometheus:    http://localhost:9090
# Kibana:        http://localhost:5601
# Jaeger:        http://localhost:16686
```

### Reset everything

```bash
docker compose -f infra/docker/docker-compose.yml down -v
# Warning: -v removes all data volumes
```

---

## Cloud Deployment (AWS EKS)

### Prerequisites

- AWS CLI configured with deployment permissions
- Terraform >= 1.9.0
- kubectl
- Helm

### Step 1: Create Terraform state backend

```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://quorvexa-terraform-state --region ap-southeast-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket quorvexa-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name quorvexa-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

### Step 2: Initialize and apply Terraform

```bash
cd infra/terraform

# Create terraform.tfvars (never commit this file)
cat > terraform.tfvars << EOF
environment = "production"
aws_region  = "ap-southeast-1"
db_password = "$(openssl rand -hex 32)"
EOF

make tf:init
make tf:plan   # Review the plan
make tf:apply  # Apply after review
```

### Step 3: Configure kubectl

```bash
aws eks update-kubeconfig \
  --region ap-southeast-1 \
  --name quorvexa-production
```

### Step 4: Deploy with Helm

```bash
# Create namespace
kubectl create namespace quorvexa

# Create secrets from environment
kubectl create secret generic auth-service-secrets \
  --namespace quorvexa \
  --from-literal=database-url="$DATABASE_URL" \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=jwt-refresh-secret="$JWT_REFRESH_SECRET"

# Apply K8s manifests
kubectl apply -f infra/k8s/base/ -R
```

### Step 5: Verify deployment

```bash
# Check pod status
kubectl get pods -n quorvexa

# Check service endpoints
kubectl get services -n quorvexa

# View logs
kubectl logs -n quorvexa -l app=auth-service -f

# Run a smoke test
curl https://api.your-domain.com/api/v1/health/live
```

---

## Azure Deployment (AKS)

```bash
# Login to Azure
az login

# Set variables
RG="quorvexa-production"
LOCATION="southeastasia"
CLUSTER="quorvexa-aks"

# Create resource group
az group create --name $RG --location $LOCATION

# Create AKS cluster
az aks create \
  --resource-group $RG \
  --name $CLUSTER \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 10 \
  --kubernetes-version 1.31 \
  --network-plugin azure \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group $RG --name $CLUSTER

# Follow same Helm deployment steps as AWS
```

---

## Environment Variable Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JWT_SECRET` | Yes | Signs access tokens — min 32 chars | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Yes | Signs refresh tokens — different from JWT_SECRET | `openssl rand -hex 32` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_HOST` | Yes | Redis hostname | `localhost` |
| `LLM_PROVIDER` | No | `local` (Ollama) or `openai` | `local` |
| `OPENAI_API_KEY` | If using OpenAI | OpenAI API key | `sk-...` |
| `VECTOR_DB_URL` | Yes for AI | Qdrant URL | `http://localhost:6333` |
| `KAFKA_BROKER` | Yes | Kafka bootstrap server | `localhost:9092` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins | `https://app.quorvexa.com` |
| `LOG_LEVEL` | No | Logging verbosity | `info` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | OpenTelemetry collector | `http://localhost:4317` |

---

## Rolling Back a Deployment

```bash
# Kubernetes rollback
kubectl rollout undo deployment/auth-service -n quorvexa

# Check rollout history
kubectl rollout history deployment/auth-service -n quorvexa

# Rollback to specific revision
kubectl rollout undo deployment/auth-service -n quorvexa --to-revision=2

# Database rollback (if migrations ran)
make migrate:rollback
```
