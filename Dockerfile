FROM node:22-slim
WORKDIR /srv
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY shared ./shared
COPY server ./server
COPY app ./app
RUN pnpm build
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "node_modules/tsx/dist/cli.mjs", "server/src/index.ts"]
