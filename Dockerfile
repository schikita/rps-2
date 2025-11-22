# ---------- build stage ----------
FROM node:22-alpine AS build

WORKDIR /app

# только зависимости
COPY package*.json ./
RUN npm ci

# остальной код
COPY . .

# билд Vite
RUN npm run build


# ---------- runtime stage ----------
FROM nginx:1.27-alpine

# убираем дефолтный конфиг и кладём свой
RUN rm /etc/nginx/conf.d/default.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# кладём собранный фронт в стандартную директорию nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
