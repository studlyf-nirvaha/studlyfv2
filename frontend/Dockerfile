FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all frontend files
COPY . .

# Expose port for Vite dev server (usually 5173, but we expose 5173 and 3000 just in case)
EXPOSE 5173
EXPOSE 3000

# Start the development server (using host 0.0.0.0 to be accessible outside the container)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
