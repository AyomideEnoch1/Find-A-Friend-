#!/bin/bash
# File: aws-migration/scripts/s3-sync.sh
# Storage Synchronization Script (Supabase S3 API -> AWS S3)
#
# Since Supabase Storage exposes an S3-compatible API, we configure the AWS CLI
# to sync objects directly from Supabase's S3 wrapper endpoint to your native Amazon S3 buckets.

# Exit on error
set -e

# ==========================================
# Configuration Variables
# ==========================================
# Supabase storage endpoints vary by project region. Format:
# s3://[project-ref] (e.g. s3://vcbtvhociaioeyhhsczh)
SUPABASE_PROJECT_REF="vcbtvhociaioeyhhsczh"
SUPABASE_S3_ENDPOINT="https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3"

AWS_S3_BUCKET_NAME="faf-infra-prod-v2-appstoragebucket-prasmiamuew2"
AWS_REGION="us-east-1"

echo "================================================================="
echo "   Find-A-Friend: Storage Bucket Synchronization Starting"
echo "================================================================="

# 1. Instruct user on credentials
echo "Please ensure you have configured your AWS CLI with:"
echo "  1. A profile named 'supabase' pointing to the Supabase endpoint"
echo "  2. The default profile pointing to AWS S3"
echo ""
echo "Command to configure Supabase profile:"
echo "  aws configure --profile supabase"
echo "  (Use your Supabase Access Key ID, Secret Access Key, and specify region)"
echo ""

# 2. Sync avatars bucket
echo "[1/3] Synchronizing avatars bucket..."
aws s3 sync \
  "s3://avatars" \
  "s3://${AWS_S3_BUCKET_NAME}/avatars" \
  --endpoint-url "$SUPABASE_S3_ENDPOINT" \
  --profile supabase \
  --region "$AWS_REGION"

# 3. Sync chat_files bucket
echo "[2/3] Synchronizing chat files bucket..."
aws s3 sync \
  "s3://chat_files" \
  "s3://${AWS_S3_BUCKET_NAME}/chat_files" \
  --endpoint-url "$SUPABASE_S3_ENDPOINT" \
  --profile supabase \
  --region "$AWS_REGION"

# 4. Sync post_attachments bucket
echo "[3/3] Synchronizing post attachments bucket..."
aws s3 sync \
  "s3://post_attachments" \
  "s3://${AWS_S3_BUCKET_NAME}/post_attachments" \
  --endpoint-url "$SUPABASE_S3_ENDPOINT" \
  --profile supabase \
  --region "$AWS_REGION"

echo "================================================================="
echo "   Storage bucket synchronization completed successfully!"
echo "================================================================="
