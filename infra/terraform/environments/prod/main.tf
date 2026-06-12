# infra/terraform/environments/prod/main.tf
#
# Production: AWS RDS + ElastiCache Redis
# Run:
#   cd infra/terraform/environments/prod
#   terraform init
#   terraform apply -var="db_password=$DB_PASS"

terraform {
  required_version = ">= 1.6"
  backend "s3" {
    bucket = "freshcrm-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "ap-south-1"
  }
}

provider "aws" {
  region = "ap-south-1"   # Mumbai — change to your region
}

# ── Data: existing VPC (create your VPC separately or import) ────
data "aws_vpc" "main" {
  tags = { Name = "freshcrm-vpc" }
}

data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
  tags = { Tier = "private" }
}

data "aws_security_group" "app" {
  tags = { Name = "freshcrm-app-prod" }
}

# ── RDS ──────────────────────────────────────────────────────────
module "rds" {
  source             = "../../modules/rds"
  env                = "prod"
  db_password        = var.db_password
  vpc_id             = data.aws_vpc.main.id
  private_subnet_ids = data.aws_subnets.private.ids
  app_sg_id          = data.aws_security_group.app.id
}

variable "db_password" {
  type      = string
  sensitive = true
}

output "database_url" {
  value     = module.rds.database_url
  sensitive = true
}
