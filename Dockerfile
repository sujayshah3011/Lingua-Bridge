# API server image for AWS Lambda (via Lambda Web Adapter) — also runs as a plain container.
FROM public.ecr.aws/docker/library/node:22-slim

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter

RUN npm install -g pnpm@11.10.0

WORKDIR /app
COPY . .
RUN pnpm install --filter @workspace/api-server... --no-frozen-lockfile \
 && pnpm --filter @workspace/api-server run build

ENV PORT=8080 \
    NODE_ENV=production \
    AWS_LWA_PORT=8080 \
    AWS_LWA_READINESS_CHECK_PATH=/api/healthz

EXPOSE 8080
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
