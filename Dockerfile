FROM node:22 AS build

ARG API_URL=http://api.local/api/
ARG NODE_OPTIONS=--max-old-space-size=2048
ENV NODE_OPTIONS=${NODE_OPTIONS}

WORKDIR /app

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN sed -i "s|__API_URL__|${API_URL}|g" src/environments/environment.prod.ts

RUN npm run build

FROM node:22-alpine

WORKDIR /app

ENV PORT=4000
ENV NODE_OPTIONS=--max-old-space-size=256

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY healthcheck.mjs ./

RUN npm ci --legacy-peer-deps --omit=dev

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
  CMD ["node", "healthcheck.mjs"]

CMD ["node", "dist/citypenha/server/server.mjs"]
