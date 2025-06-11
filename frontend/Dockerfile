# ─── Build Stage ───
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files & install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code & build the app
COPY . .
RUN npm run build

# ─── Production Stage ───
FROM nginx:stable-alpine

# Remove default Nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built files from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config (this line is NEW and very important)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for static content
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
