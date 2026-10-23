#!/usr/bin/env bash
# Deploys the API server as a container-image Lambda behind a public HTTPS Function URL.
# Re-runnable: creates what's missing, updates the rest.
#
#   export SARVAM_API_KEY=...
#   export ELEVENLABS_API_KEY=...
#   export FIREBASE_SA_JSON=/path/to/firebase-service-account.json
#   export BOLNA_API_KEY=... BOLNA_AGENT_ID=...   (optional: reminder calls)
#   ./deploy/aws-lambda.sh
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
NAME="lingua-bridge-api"
: "${SARVAM_API_KEY:?set SARVAM_API_KEY}" "${ELEVENLABS_API_KEY:?set ELEVENLABS_API_KEY}" "${FIREBASE_SA_JSON:?set FIREBASE_SA_JSON}"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REPO_URI="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$NAME"
ROLE_ARN="arn:aws:iam::$ACCOUNT:role/$NAME-role"
cd "$(dirname "$0")/.."

# --- Firebase service account -> env values (B64 sidesteps PEM newline mangling)
read -r FB_PROJECT FB_EMAIL FB_KEY_B64 < <(python3 - "$FIREBASE_SA_JSON" <<'PY'
import base64, json, sys
d = json.load(open(sys.argv[1]))
print(d["project_id"], d["client_email"], base64.b64encode(d["private_key"].encode()).decode())
PY
)

ENV_JSON="$(python3 - <<PY
import json
env = {
  "SARVAM_API_KEY": "$SARVAM_API_KEY",
  "ELEVENLABS_API_KEY": "$ELEVENLABS_API_KEY",
  "FIREBASE_PROJECT_ID": "$FB_PROJECT",
  "FIREBASE_CLIENT_EMAIL": "$FB_EMAIL",
  "FIREBASE_PRIVATE_KEY_B64": "$FB_KEY_B64",
  "BOLNA_API_KEY": "${BOLNA_API_KEY:-}",
  "BOLNA_AGENT_ID": "${BOLNA_AGENT_ID:-}",
}
env = {k: v for k, v in env.items() if v}
s = json.dumps({"Variables": env})
assert len(s) < 4000, "Lambda env vars are capped at 4KB"
print(s)
PY
)"

# --- ECR repo + image
aws ecr describe-repositories --region "$REGION" --repository-names "$NAME" >/dev/null 2>&1 \
  || aws ecr create-repository --region "$REGION" --repository-name "$NAME" >/dev/null
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"
# Lambda rejects OCI image indexes, so no provenance/attestation manifests.
docker build --platform linux/arm64 --provenance=false -t "$REPO_URI:latest" .
docker push "$REPO_URI:latest"

# --- IAM role
if ! aws iam get-role --role-name "$NAME-role" >/dev/null 2>&1; then
  aws iam create-role --role-name "$NAME-role" --assume-role-policy-document \
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  aws iam attach-role-policy --role-name "$NAME-role" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "waiting for IAM role to propagate..."; sleep 15
fi

# --- Lambda function
if aws lambda get-function --region "$REGION" --function-name "$NAME" >/dev/null 2>&1; then
  aws lambda update-function-code --region "$REGION" --function-name "$NAME" --image-uri "$REPO_URI:latest" >/dev/null
  aws lambda wait function-updated --region "$REGION" --function-name "$NAME"
  aws lambda update-function-configuration --region "$REGION" --function-name "$NAME" \
    --memory-size 1024 --timeout 60 --environment "$ENV_JSON" >/dev/null
else
  aws lambda create-function --region "$REGION" --function-name "$NAME" \
    --package-type Image --code ImageUri="$REPO_URI:latest" --architectures arm64 \
    --role "$ROLE_ARN" --memory-size 1024 --timeout 60 --environment "$ENV_JSON" >/dev/null
fi
aws lambda wait function-active-v2 --region "$REGION" --function-name "$NAME"

# --- Public HTTPS URL (the app authenticates with Firebase tokens, not IAM)
if ! aws lambda get-function-url-config --region "$REGION" --function-name "$NAME" >/dev/null 2>&1; then
  aws lambda create-function-url-config --region "$REGION" --function-name "$NAME" --auth-type NONE >/dev/null
  aws lambda add-permission --region "$REGION" --function-name "$NAME" --statement-id url-invoke-url \
    --action lambda:InvokeFunctionUrl --principal '*' --function-url-auth-type NONE >/dev/null
  aws lambda add-permission --region "$REGION" --function-name "$NAME" --statement-id url-invoke-fn \
    --action lambda:InvokeFunction --principal '*' --invoked-via-function-url >/dev/null
fi

URL="$(aws lambda get-function-url-config --region "$REGION" --function-name "$NAME" --query FunctionUrl --output text)"
URL="${URL%/}"
echo "API base: $URL/api"
curl -fsS -m 30 "$URL/api/healthz" && echo
