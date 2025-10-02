#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting WebMeter Development Environment${NC}"

# Function to check if PostgreSQL is running
check_postgres() {
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is running${NC}"
        return 0
    else
        echo -e "${RED}❌ PostgreSQL is not running. Please start PostgreSQL service first.${NC}"
        echo "  sudo systemctl start postgresql"
        return 1
    fi
}

# Function to check if database exists
check_database() {
    if psql -h localhost -p 5432 -U webmeter_app -d Webmeter_db -c '\q' >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database 'Webmeter_db' is accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ Database 'Webmeter_db' is not accessible${NC}"
        echo "  Please run the database setup scripts:"
        echo "  sudo -u postgres psql -f database/simple_user_database.sql"
        echo "  sudo -u postgres psql -f database/simple_user_data.sql"
        return 1
    fi
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! check_postgres; then
    exit 1
fi

if ! check_database; then
    exit 1
fi

# Start backend server
echo -e "${BLUE}🔧 Starting API Server...${NC}"
cd server
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing server dependencies...${NC}"
    npm install
fi

# Start server in background
npm run dev &
SERVER_PID=$!
echo -e "${GREEN}✅ API Server started (PID: $SERVER_PID)${NC}"

# Wait a moment for server to start
sleep 3

# Test API server
if curl -s http://localhost:3001/api/health >/dev/null; then
    echo -e "${GREEN}✅ API Server is responding${NC}"
else
    echo -e "${RED}❌ API Server is not responding${NC}"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

cd ..

# Start frontend
echo -e "${BLUE}🎨 Starting Frontend Development Server...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}🌟 WebMeter Development Environment is starting...${NC}"
echo -e "${BLUE}📱 Frontend: http://localhost:5173${NC}"
echo -e "${BLUE}🔌 API Server: http://localhost:3001${NC}"
echo -e "${BLUE}📊 API Health: http://localhost:3001/api/health${NC}"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop both servers${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${BLUE}🛑 Shutting down servers...${NC}"
    kill $SERVER_PID 2>/dev/null
    echo -e "${GREEN}✅ Cleanup completed${NC}"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup INT TERM

# Start frontend (this will block)
npm run dev

# If we reach here, cleanup
cleanup
