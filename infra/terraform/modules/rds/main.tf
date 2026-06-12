# infra/terraform/modules/rds/main.tf
#
# Provisions AWS RDS Postgres 15 for FreshCRM.
# Usage: see environments/prod/main.tf

terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "env"              { type = string }   # dev | staging | prod
variable "db_password"      { type = string, sensitive = true }
variable "vpc_id"           { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "app_sg_id"        { type = string }   # security group of your app

# ── Security group: only accept from app ─────────────────────────
resource "aws_security_group" "rds" {
  name   = "freshcrm-rds-${var.env}"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.app_sg_id]
    description     = "Postgres from app only"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "freshcrm-rds-${var.env}" }
}

# ── Subnet group ─────────────────────────────────────────────────
resource "aws_db_subnet_group" "this" {
  name       = "freshcrm-${var.env}"
  subnet_ids = var.private_subnet_ids
}

# ── Parameter group: UTF-8 and Postgres tuning ───────────────────
resource "aws_db_parameter_group" "this" {
  name   = "freshcrm-pg15-${var.env}"
  family = "postgres15"

  parameter { name = "client_encoding", value = "UTF8" }
  parameter { name = "timezone",        value = "UTC" }
  parameter { name = "log_min_duration_statement", value = "1000" }
}

# ── RDS instance ─────────────────────────────────────────────────
resource "aws_db_instance" "this" {
  identifier        = "freshcrm-${var.env}"
  engine            = "postgres"
  engine_version    = "15.6"
  instance_class    = var.env == "prod" ? "db.t3.medium" : "db.t3.micro"

  db_name  = "freshcrm"
  username = "freshcrm"
  password = var.db_password

  allocated_storage     = var.env == "prod" ? 50 : 20
  max_allocated_storage = var.env == "prod" ? 200 : 20   # auto-scaling on prod
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.this.name

  multi_az               = var.env == "prod"   # HA only on prod
  publicly_accessible    = false               # never public
  deletion_protection    = var.env == "prod"

  backup_retention_period = var.env == "prod" ? 7 : 1
  backup_window           = "02:00-03:00"      # UTC
  maintenance_window      = "sun:03:00-sun:04:00"

  skip_final_snapshot     = var.env != "prod"
  final_snapshot_identifier = var.env == "prod" ? "freshcrm-prod-final" : null

  tags = {
    Project     = "freshcrm"
    Environment = var.env
    ManagedBy   = "terraform"
  }
}

output "endpoint" {
  value       = aws_db_instance.this.endpoint
  description = "RDS endpoint — use in DATABASE_URL"
}

output "database_url" {
  value       = "postgresql://freshcrm:${var.db_password}@${aws_db_instance.this.endpoint}/freshcrm?sslmode=require"
  sensitive   = true
  description = "Full DATABASE_URL for .env"
}
