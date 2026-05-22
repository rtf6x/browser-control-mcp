FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY mcp-server/package*.json ./mcp-server/

# Copy common directory (shared dependency)
COPY common/ ./common/

# Set working directory to mcp-server for installation
WORKDIR /app/mcp-server

# Install dependencies
RUN npm install

# Copy mcp-server source code
COPY mcp-server/ ./

# Build mcp-server
RUN npm run build

# Expose MCP HTTP (8090) and extension WebSocket (8089) ports
ENV EXTENSION_PORT=8089
ENV MCP_HTTP_PORT=8090
ENV CONTAINERIZED=true

EXPOSE 8089 8090

# Start the persistent HTTP MCP server
CMD ["node", "dist/http-server.js"]