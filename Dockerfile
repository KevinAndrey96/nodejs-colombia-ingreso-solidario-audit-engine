FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Environment Defaults
ENV NODE_ENV=production
ENV PORT=8097
ENV DB_HOST=db
ENV DB_PORT=3306
ENV DB_USER=cedulas_user
ENV DB_PASSWORD=cedulas_secure_password
ENV DB_NAME=cedulas_db
ENV DB_DIALECT=mysql

EXPOSE 8097

CMD ["node", "app.js"]
