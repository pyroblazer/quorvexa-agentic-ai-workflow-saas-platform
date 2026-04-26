variable "environment" {
  description = "Deployment environment (production, staging)"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Must be production, staging, or development."
  }
}

variable "aws_region" {
  description = "AWS region for primary deployment"
  type        = string
  default     = "ap-southeast-1"
}

variable "azure_region" {
  description = "Azure region for secondary deployment"
  type        = string
  default     = "southeastasia"
}

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
  default     = "quorvexa"
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.31"
}

variable "eks_node_instance_types" {
  description = "EC2 instance types for EKS node groups"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

variable "eks_node_desired_size" {
  type    = number
  default = 3
}

variable "eks_node_min_size" {
  type    = number
  default = 1
}

variable "eks_node_max_size" {
  type    = number
  default = 10
}

# RDS Configuration
variable "db_instance_class" {
  type    = string
  default = "db.t3.medium"
}

variable "db_allocated_storage" {
  type    = number
  default = 100
}

variable "db_password" {
  description = "PostgreSQL master password — store in secrets manager, not in tfvars"
  type        = string
  sensitive   = true
}

# Networking
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-southeast-1a", "ap-southeast-1b", "ap-southeast-1c"]
}
