FROM node:20

EXPOSE 3000

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install && npm cache clean --force

COPY . .

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Generate Prisma client
RUN npx prisma generate

# Build the React Router app
RUN npm run build

RUN npm prune --omit=dev

ENV NODE_ENV=production

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
