# File: aws-migration/scripts/deploy-infrastructure.ps1
# AWS CloudFormation Infrastructure Deployment Automation Script
#
# This script automates:
#   1. Resolving the current AWS Account ID.
#   2. Creating a bootstrap S3 bucket to host the Cognito Lambda ZIP.
#   3. Uploading the migration_lambda_payload.zip to S3.
#   4. Executing the CloudFormation deployment to provision all AWS resources.
#   5. Retrieving the deployed endpoints and resource IDs.

$ErrorActionPreference = "Stop"

# Define executable path
$AWS_PATH = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"

Write-Output "=========================================================="
Write-Output "   Find-A-Friend: AWS CloudFormation Infrastructure Deploy"
Write-Output "=========================================================="

# 1. Fetch AWS Caller Identity and Account ID
Write-Output "[1/5] Fetching AWS Account Identity..."
$identityJson = & $AWS_PATH sts get-caller-identity --no-verify-ssl | Out-String
$identity = $identityJson | ConvertFrom-Json
$accountId = $identity.Account
Write-Output "Authenticated successfully to AWS Account: $accountId"

# 2. Define bucket name and configuration
$bootstrapBucketName = "faf-migration-bootstrap-$accountId"
$stackName = "faf-infra-prod-v2"
$lambdaZipLocalPath = "aws-migration/terraform/migration_lambda_payload.zip"
$cfTemplatePath = "aws-migration/cloudformation/infra.yaml"

# 3. Create the bootstrap S3 bucket
Write-Output "[2/5] Setting up bootstrap S3 bucket: $bootstrapBucketName..."
$bucketCheck = & $AWS_PATH s3 ls | Out-String
if ($bucketCheck -match $bootstrapBucketName) {
    Write-Output "Bootstrap bucket already exists."
} else {
    Write-Output "Creating new bootstrap bucket..."
    & $AWS_PATH s3 mb "s3://$bootstrapBucketName" --region us-east-1 --no-verify-ssl
}

# 4. Upload the Lambda ZIP payload
Write-Output "[3/5] Uploading Cognito Migration Lambda ZIP..."
if (-Not (Test-Path $lambdaZipLocalPath)) {
    throw "Lambda ZIP package not found at $lambdaZipLocalPath. Please run lambda packaging first."
}
& $AWS_PATH s3 cp $lambdaZipLocalPath "s3://$bootstrapBucketName/migration_lambda_payload.zip" --no-verify-ssl

# 5. Prompt/Generate DB Master Password
Write-Output "[4/5] Securing Database password..."
# Generate a strong password (16 characters: letters & numbers)
$chars = [char[]]"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
$dbPassword = ""
for ($i=0; $i -lt 16; $i++) {
    $dbPassword += $chars[(Get-Random -Maximum $chars.Count)]
}
Write-Output "Generated strong database password: $dbPassword"
Write-Output "--> PLEASE COPY AND SAVE THIS PASSWORD SECURELY! <--"

# 6. Deploy CloudFormation template
Write-Output "[5/5] Deploying CloudFormation Stack. This may take 5-10 minutes..."
Write-Output "Provisioning network subnets, RDS PostgreSQL, Cognito, S3 storage, and ECS Fargate..."
& $AWS_PATH cloudformation deploy `
  --template-file $cfTemplatePath `
  --stack-name $stackName `
  --parameter-overrides `
      DBMasterUsername=postgres `
      DBMasterPassword=$dbPassword `
      LambdaSourceBucket=$bootstrapBucketName `
      LambdaSourceObjectKey=migration_lambda_payload.zip `
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM `
  --no-verify-ssl

# 7. Print Outputs
Write-Output "=========================================================="
Write-Output "   Stack Deployment Completed Successfully!"
Write-Output "=========================================================="

# Fetch outputs
$outputsJson = & $AWS_PATH cloudformation describe-stacks --stack-name $stackName --query "Stacks[0].Outputs" --no-verify-ssl | Out-String
$outputs = $outputsJson | ConvertFrom-Json

foreach ($out in $outputs) {
    Write-Output "$($out.OutputKey) : $($out.OutputValue)"
}
