FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
# Hỗ trợ lần đầu chưa có package-lock.json; sau npm install sẽ ưu tiên npm ci
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY scripts ./scripts
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js && exec node src/server.js"]
