# Infrastructure as Code: Supabase to AWS Migration Blueprint
# File: aws-migration/terraform/main.tf

terraform {
  required_version = ">= 1.2.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ==========================================
# 1. Variables
# ==========================================

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Target AWS region"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment name"
}

variable "db_master_username" {
  type        = string
  default     = "postgres"
  description = "Aurora database master username"
}

variable "db_master_password" {
  type        = string
  sensitive   = true
  description = "Aurora database master password"
}

# ==========================================
# 2. Networking (VPC)
# ==========================================

data "aws_availability_zones" "available" {}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name        = "faf-vpc-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name = "faf-public-subnet-${count.index}-${var.environment}"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = {
    Name = "faf-private-subnet-${count.index}-${var.environment}"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "faf-igw-${var.environment}"
  }
}

resource "aws_eip" "nat" {
  vpc        = true
  depends_on = [aws_internet_gateway.gw]
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags = {
    Name = "faf-nat-gw-${var.environment}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
  tags = {
    Name = "faf-public-rt-${var.environment}"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }
  tags = {
    Name = "faf-private-rt-${var.environment}"
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ==========================================
# 3. Database (Amazon Aurora PostgreSQL Serverless v2)
# ==========================================

resource "aws_db_subnet_group" "db" {
  name       = "faf-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
  tags = {
    Name = "FAF DB subnet group"
  }
}

resource "aws_security_group" "db" {
  name        = "faf-db-sg-${var.environment}"
  description = "Allow inbound Postgres connection"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL port from ECS and Lambda"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id, aws_security_group.lambda.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_rds_cluster" "aurora" {
  cluster_identifier   = "faf-aurora-cluster-${var.environment}"
  engine               = "aurora-postgresql"
  engine_mode          = "provisioned"
  engine_version       = "15.18"
  database_name        = "faf_db"
  master_username      = var.db_master_username
  master_password      = var.db_master_password
  db_subnet_group_name = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db.id]
  skip_final_snapshot  = true

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 4.0
  }
}

resource "aws_rds_cluster_instance" "aurora_instance" {
  cluster_identifier = aws_rds_cluster.aurora.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.aurora.engine
  engine_version     = aws_rds_cluster.aurora.engine_version
  publicly_accessible = false
}

# ==========================================
# 4. Storage (Amazon S3)
# ==========================================

resource "aws_s3_bucket" "storage" {
  bucket        = "faf-storage-${var.environment}-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "storage_pab" {
  bucket = aws_s3_bucket.storage.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_cors_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

data "aws_caller_identity" "current" {}

# ==========================================
# 5. Authentication & Lazy Migration (Cognito + Lambda)
# ==========================================

resource "aws_security_group" "lambda" {
  name        = "faf-lambda-migration-sg-${var.environment}"
  description = "Security Group for Migration Lambda"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "lambda" {
  name = "faf-lambda-migration-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Cognito User Pool
resource "aws_cognito_user_pool" "pool" {
  name = "faf-user-pool-${var.environment}"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 6
    require_lowercase = false
    require_numbers   = false
    require_symbols   = false
    require_uppercase = false
  }

  schema {
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    name                     = "legacy_id"
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # Configures the User Migration Lambda trigger
  lambda_config {
    user_migration = aws_lambda_function.migration.arn
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name         = "faf-app-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.pool.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}

# AWS Lambda user migration trigger code resource
resource "aws_lambda_function" "migration" {
  filename      = "migration_lambda_payload.zip" # Packaged locally during deployment
  function_name = "faf-cognito-lazy-migration-${var.environment}"
  role          = aws_iam_role.lambda.arn
  handler       = "cognito-lazy-migration.handler"
  runtime       = "nodejs18.x"
  timeout       = 30

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_HOST     = aws_rds_cluster.aurora.endpoint
      DB_PORT     = "5432"
      DB_NAME     = aws_rds_cluster.aurora.database_name
      DB_USER     = aws_rds_cluster.aurora.master_username
      DB_PASSWORD = var.db_master_password
    }
  }
}

resource "aws_lambda_permission" "cognito" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.migration.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.pool.arn
}

# ==========================================
# 6. API Layer (ECS Fargate + PostgREST + ALB)
# ==========================================

# Application Load Balancer (ALB)
resource "aws_security_group" "alb" {
  name        = "faf-alb-sg-${var.environment}"
  description = "ALB Public Access Security Group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS public traffic"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP public traffic (redirected or direct)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lb" "alb" {
  name               = "faf-api-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}

resource "aws_lb_target_group" "postgrest" {
  name        = "faf-tg-postgrest-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    port                = "3000"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 5
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.postgrest.arn
  }
}

# ECS Fargate Cluster
resource "aws_ecs_cluster" "main" {
  name = "faf-ecs-cluster-${var.environment}"
}

# Security Group for Fargate tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "faf-ecs-tasks-sg-${var.environment}"
  description = "Allow ALB connections to ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgREST internal access"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "faf-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Definition running official PostgREST
resource "aws_ecs_task_definition" "postgrest" {
  family                   = "postgrest-task-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "postgrest"
      image     = "postgrest/postgrest:v11.1.0"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "PGRST_DB_URI"
          value = "postgres://${aws_rds_cluster.aurora.master_username}:${var.db_master_password}@${aws_rds_cluster.aurora.endpoint}:5432/${aws_rds_cluster.aurora.database_name}"
        },
        {
          name  = "PGRST_DB_SCHEMA"
          value = "public"
        },
        {
          name  = "PGRST_DB_ANON_ROLE"
          value = "anon"
        },
        {
          name  = "PGRST_JWT_SECRET"
          value = "{\"key\":\"your_jwt_signing_key_matching_cognito\",\"type\":\"HS256\"}" # PostgREST decodes JWTs from client
        }
      ]
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "postgrest" {
  name            = "faf-postgrest-service-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.postgrest.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.postgrest.arn
    container_name   = "postgrest"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]
}

# ==========================================
# 7. Outputs
# ==========================================

output "aurora_endpoint" {
  value       = aws_rds_cluster.aurora.endpoint
  description = "Aurora Cluster Endpoint"
}

output "cognito_user_pool_id" {
  value       = aws_cognito_user_pool.pool.id
  description = "Cognito User Pool ID"
}

output "cognito_client_id" {
  value       = aws_cognito_user_pool_client.client.id
  description = "Cognito Client ID"
}

output "alb_dns_name" {
  value       = aws_lb.alb.dns_name
  description = "Application Load Balancer Endpoint (API Gateway)"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.storage.id
  description = "AWS S3 Storage Bucket Name"
}
