#!/bin/bash
# File: aws-migration/scripts/db-dump-import.sh
# Database Dump and Data Porting Script (Supabase -> AWS Aurora)
#
# This script extracts all table structures and data from Supabase, prepares
# the transition credentials table, and loads them into your AWS Aurora Serverless instance.

# Set bash to fail on any error
set -e

# ==========================================
# Configuration Variables
# ==========================================
SUPABASE_HOST="vcbtvhociaioeyhhsczh.supabase.co"
SUPABASE_DB="postgres"
SUPABASE_USER="postgres"
SUPABASE_PORT="5432"

AURORA_HOST="faf-infra-prod-v2-rdsinstance-jmrivbavtegl.csr8okcacgur.us-east-1.rds.amazonaws.com"
AURORA_DB="faf_db"
AURORA_USER="postgres"
AURORA_PORT="5432"

# Filenames
DUMP_ALL="supabase_dump_all.sql"
DUMP_LEGACY_USERS="supabase_auth_users.csv"

echo "================================================================="
echo "   Find-A-Friend: Supabase to AWS Database Migration Starting"
echo "================================================================="

# 1. Prompt for password security
read -sp "Enter Supabase DB Password: " SUPABASE_PASSWORD
echo ""
read -sp "Enter AWS Aurora DB Password: " AURORA_PASSWORD
echo ""

export PGPASSWORD=$SUPABASE_PASSWORD

# 2. Dump all public schema and other schemas from Supabase
echo "[1/5] Dumping database schemas and data from Supabase..."
pg_dump \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  --clean --no-owner --no-privileges \
  -f "$DUMP_ALL"

# 3. Export Supabase internal auth.users (requires superuser access or database dashboard query)
# Since auth.users is protected, we extract the id, email, and encrypted password hash.
echo "[2/5] Extracting Supabase auth.users credential hashes..."
psql \
  -h "$SUPABASE_HOST" \
  -p "$SUPABASE_PORT" \
  -U "$SUPABASE_USER" \
  -d "$SUPABASE_DB" \
  -c "\copy (SELECT id, email, encrypted_password, raw_user_meta_data->>'full_name' as full_name FROM auth.users) TO '$DUMP_LEGACY_USERS' WITH CSV HEADER"

# Switch password to Aurora
export PGPASSWORD=$AURORA_PASSWORD

# 4. Prepare target Aurora database structures
echo "[3/5] Setting up target schema and migration table in AWS Aurora..."
# Create the table where legacy hashes will live for Cognito Lambda
psql -h "$AURORA_HOST" -p "$AURORA_PORT" -U "$AURORA_USER" -d "$AURORA_DB" -c "
CREATE TABLE IF NOT EXISTS public.legacy_auth_credentials (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    encrypted_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
"

# 5. Populate the legacy credential table in Aurora
echo "[4/5] Importing credential hashes into public.legacy_auth_credentials..."
psql -h "$AURORA_HOST" -p "$AURORA_PORT" -U "$AURORA_USER" -d "$AURORA_DB" -c "
\copy public.legacy_auth_credentials (id, email, encrypted_password, full_name) FROM '$DUMP_LEGACY_USERS' WITH CSV HEADER
"

# 6. Restore public database schema and data in Aurora
echo "[5/5] Restoring application database tables, triggers, and indices..."
psql -h "$AURORA_HOST" -p "$AURORA_PORT" -U "$AURORA_USER" -d "$AURORA_DB" -f "$DUMP_ALL"

# Cleanup environment variables
unset PGPASSWORD
rm -f "$DUMP_LEGACY_USERS"

echo "================================================================="
echo "   Database Migration Completed Successfully!"
echo "================================================================="
