# ---- Imagen base ----
    FROM node:20-slim

    # ---- Variables de entorno de tiempo de compilación ----
    ARG PORT=3000
    
    # ---- Directorio de trabajo ----
    WORKDIR /app
    
    # ---- Instalación de dependencias ----
    COPY package*.json ./
    RUN npm install --production
    
    # ---- Copiar código fuente ----
    COPY index.js ./
    
    # ---- Exponer puerto ----
    EXPOSE ${PORT}
    
    # ---- Comando por defecto ----
    CMD ["node", "index.js"]
    