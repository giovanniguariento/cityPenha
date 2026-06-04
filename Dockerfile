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

COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

RUN npm ci --legacy-peer-deps --omit=dev

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/home').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/citypenha/server/server.mjs"]
