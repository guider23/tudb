# FastAPI Architecture Guide for TUDB

This document provides architectural guidance for implementing TUDB using Python with FastAPI instead of Node.js/TypeScript. The core concepts remain the same, but with Python-specific implementations.

## 📋 Overview

The FastAPI implementation follows the same architecture as the TypeScript version:
- **Backend API**: FastAPI with async endpoints
- **MCP Tool Server**: FastAPI JSON-RPC server
- **Database Abstraction**: asyncpg with provider-specific clients
- **Bedrock Integration**: boto3 with async support
- **SQL Validation**: Python-based safety validator
- **Audit Logging**: Async database logging

## 🏗️ Project Structure

```
tudb-python/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application
│   │   ├── config.py               # Configuration management
│   │   ├── dependencies.py         # Dependency injection
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── request.py         # Pydantic request models
│   │   │   └── response.py        # Pydantic response models
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   └── query.py           # Query endpoint router
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── bedrock_client.py  # AWS Bedrock integration
│   │   │   ├── mcp_client.py      # MCP tool client
│   │   │   └── audit_logger.py    # Audit logging service
│   │   ├── safety/
│   │   │   ├── __init__.py
│   │   │   └── sql_validator.py   # SQL safety validation
│   │   └── prompts/
│   │       ├── __init__.py
│   │       └── bedrock_prompts.py # System prompts & examples
│   └── requirements.txt
├── mcp_tool_server/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── server.py              # MCP FastAPI server
│   │   └── tools.py               # Tool implementations
│   └── requirements.txt
├── db/
│   ├── __init__.py
│   ├── base_client.py             # Abstract base client
│   ├── postgres_client.py         # Local Postgres
│   ├── supabase_client.py         # Supabase
│   ├── neon_client.py             # Neon
│   ├── railway_client.py          # Railway
│   ├── rds_client.py              # AWS RDS
│   └── db_router.py               # Database router
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── seed/
│   │   └── seed_data.sql
│   ├── migrate.py
│   └── seed.py
├── tests/
│   ├── __init__.py
│   ├── test_sql_validator.py
│   ├── test_db_router.py
│   └── test_e2e_flow.py
├── .env.example
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔧 Core Components

### 1. FastAPI Backend (`backend/app/main.py`)

```python
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from .routers import query
from .config import settings
from db.db_router import DatabaseRouter

# Initialize FastAPI app
app = FastAPI(
    title="TUDB - Talk to Your Database",
    description="Natural Language to SQL Agent with Multi-Database Support",
    version="1.0.0"
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# Logging configuration
logging.basicConfig(
    level=settings.log_level,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    try:
        await DatabaseRouter.connect()
        logger.info(f"Database connected: {DatabaseRouter.get_current_provider()}")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    await DatabaseRouter.disconnect()
    logger.info("Database disconnected")


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "provider": DatabaseRouter.get_current_provider(),
        "timestamp": datetime.utcnow().isoformat()
    }


# Include routers
app.include_router(
    query.router,
    prefix="/api",
    tags=["query"]
)


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )
```

### 2. Query Router (`backend/app/routers/query.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
import logging

from ..models.request import QueryRequest
from ..models.response import QueryResponse, ClarificationResponse, BlockedResponse
from ..services.bedrock_client import BedrockClient
from ..services.mcp_client import MCPToolClient
from ..services.audit_logger import AuditLogger
from ..safety.sql_validator import SQLValidator
from ..config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


async def verify_api_key(x_api_key: str = Header(...)):
    """Verify API key from header"""
    if x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


@router.post("/query", response_model=QueryResponse)
async def process_query(
    request: QueryRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Process natural language query and return SQL results
    """
    logger.info(f"Query from user {request.user_id}: {request.question}")
    
    bedrock_client = BedrockClient()
    mcp_client = MCPToolClient()
    sql_validator = SQLValidator()
    audit_logger = AuditLogger()
    
    try:
        # Step 1: Get schema information
        tables = await mcp_client.list_tables()
        schema_context = await build_schema_context(tables, request.question, mcp_client)
        
        # Step 2: Query Bedrock
        llm_response = await bedrock_client.query(
            request.question,
            schema_context
        )
        
        # Step 3: Handle clarification
        if llm_response.get("clarify"):
            await audit_logger.log({
                "user_id": request.user_id,
                "session_id": request.session_id,
                "question": request.question,
                "generated_sql": None,
                "allowed": True,
                "result_count": 0,
                "status": "clarification_needed",
                "clarification": llm_response["clarify"]
            })
            
            return ClarificationResponse(
                status="clarification_needed",
                message=llm_response["clarify"]
            )
        
        # Step 4: Validate SQL
        if llm_response.get("tool") == "run_sql":
            sql = llm_response["input"]["query"]
            max_rows = llm_response["input"].get("max_rows", 100)
            
            validation = sql_validator.validate(sql)
            
            if not validation.is_valid:
                await audit_logger.log({
                    "user_id": request.user_id,
                    "session_id": request.session_id,
                    "question": request.question,
                    "generated_sql": sql,
                    "allowed": False,
                    "result_count": 0,
                    "status": "blocked",
                    "error": validation.error
                })
                
                return BlockedResponse(
                    status="blocked",
                    error=validation.error,
                    suggestion=validation.suggestion
                )
            
            # Step 5: Execute query
            query_result = await mcp_client.run_sql(sql, max_rows)
            explanation = await mcp_client.explain_query(sql)
            
            # Step 6: Generate summary
            summary = await bedrock_client.generate_summary(
                request.question,
                sql,
                query_result,
                explanation
            )
            
            # Step 7: Audit log
            await audit_logger.log({
                "user_id": request.user_id,
                "session_id": request.session_id,
                "question": request.question,
                "generated_sql": sql,
                "allowed": True,
                "result_count": query_result["rowCount"],
                "status": "success"
            })
            
            return QueryResponse(
                status="success",
                query=sql,
                results=query_result["rows"],
                row_count=query_result["rowCount"],
                truncated=query_result.get("truncated", False),
                explanation=explanation,
                summary=summary
            )
        
        raise HTTPException(status_code=500, detail="Unexpected LLM response")
        
    except Exception as e:
        logger.error(f"Query processing failed: {e}", exc_info=True)
        
        await audit_logger.log({
            "user_id": request.user_id,
            "session_id": request.session_id,
            "question": request.question,
            "generated_sql": None,
            "allowed": False,
            "result_count": 0,
            "status": "error",
            "error": str(e)
        })
        
        raise HTTPException(status_code=500, detail=str(e))


async def build_schema_context(tables: list, question: str, mcp_client: MCPToolClient) -> str:
    """Build schema context for LLM"""
    lower_question = question.lower()
    relevant_tables = [t for t in tables if t.lower() in lower_question]
    
    tables_to_describe = relevant_tables if relevant_tables else tables[:5]
    
    descriptions = []
    for table in tables_to_describe:
        desc = await mcp_client.describe_table(table)
        descriptions.append({
            "table": table,
            "columns": [f"{c['columnName']} ({c['dataType']})" for c in desc["columns"]],
            "primaryKeys": desc["primaryKeys"],
            "foreignKeys": [
                f"{fk['columnName']} -> {fk['referencedTable']}.{fk['referencedColumn']}"
                for fk in desc["foreignKeys"]
            ]
        })
    
    return json.dumps({"tables": descriptions}, indent=2)
```

### 3. Pydantic Models (`backend/app/models/request.py`)

```python
from pydantic import BaseModel, Field
from typing import Optional


class QueryRequest(BaseModel):
    """Request model for natural language query"""
    user_id: str = Field(..., description="User identifier")
    question: str = Field(..., min_length=1, description="Natural language question")
    session_id: Optional[str] = Field(None, description="Optional session identifier")
    
    class Config:
        schema_extra = {
            "example": {
                "user_id": "user_123",
                "question": "Show me the top 5 products by revenue last month",
                "session_id": "session_abc"
            }
        }
```

### 4. Database Abstraction (`db/base_client.py`)

```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import asyncpg
from dataclasses import dataclass


@dataclass
class ColumnInfo:
    column_name: str
    data_type: str
    is_nullable: bool
    default_value: Optional[str]
    max_length: Optional[int]


@dataclass
class ForeignKeyInfo:
    column_name: str
    referenced_table: str
    referenced_column: str


@dataclass
class TableDescription:
    table_name: str
    columns: List[ColumnInfo]
    primary_keys: List[str]
    foreign_keys: List[ForeignKeyInfo]


class DatabaseClient(ABC):
    """Abstract base class for database clients"""
    
    @abstractmethod
    async def connect(self) -> None:
        """Establish database connection"""
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """Close database connection"""
        pass
    
    @abstractmethod
    async def list_tables(self) -> List[str]:
        """List all tables in the database"""
        pass
    
    @abstractmethod
    async def describe_table(self, table_name: str) -> TableDescription:
        """Get detailed table schema information"""
        pass
    
    @abstractmethod
    async def run_safe_query(self, sql: str, params: Optional[List[Any]] = None) -> Dict[str, Any]:
        """Execute a safe read-only query"""
        pass
    
    @abstractmethod
    async def explain_query(self, sql: str) -> str:
        """Get query execution plan explanation"""
        pass
    
    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name"""
        pass


class BasePostgresClient(DatabaseClient):
    """Base implementation for PostgreSQL clients"""
    
    def __init__(self, connection_string: str, provider_name: str, pool_config: Dict[str, Any]):
        self.connection_string = connection_string
        self.provider_name = provider_name
        self.pool_config = pool_config
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self) -> None:
        """Create connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                self.connection_string,
                **self.pool_config
            )
            # Test connection
            async with self.pool.acquire() as conn:
                await conn.fetchval('SELECT 1')
            print(f"✓ Connected to {self.provider_name}")
        except Exception as e:
            raise Exception(f"Failed to connect to {self.provider_name}: {e}")
    
    async def disconnect(self) -> None:
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
            self.pool = None
    
    def get_provider_name(self) -> str:
        return self.provider_name
    
    async def list_tables(self) -> List[str]:
        """List all tables"""
        query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query)
            return [row['table_name'] for row in rows]
    
    async def describe_table(self, table_name: str) -> TableDescription:
        """Get table schema details"""
        # Implementation similar to TypeScript version
        # ... (column query, primary key query, foreign key query)
        pass
    
    async def run_safe_query(self, sql: str, params: Optional[List[Any]] = None) -> Dict[str, Any]:
        """Execute safe query with READ_ONLY checks"""
        # Implementation with safety checks
        pass
    
    async def explain_query(self, sql: str) -> str:
        """Get query execution plan"""
        explain_sql = f"EXPLAIN (FORMAT JSON) {sql}"
        async with self.pool.acquire() as conn:
            result = await conn.fetchval(explain_sql)
            # Parse and return human-readable explanation
            return f"Query execution plan: {result}"
```

### 5. Bedrock Client (`backend/app/services/bedrock_client.py`)

```python
import boto3
import json
from typing import Dict, Any
import logging

from ..config import settings
from ..prompts.bedrock_prompts import SYSTEM_PROMPT, FEW_SHOT_EXAMPLES, build_tool_definitions

logger = logging.getLogger(__name__)


class BedrockClient:
    """AWS Bedrock Claude 3 client"""
    
    def __init__(self):
        self.client = boto3.client(
            'bedrock-runtime',
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key
        )
        self.model_id = settings.bedrock_model_id
    
    async def query(self, question: str, schema_context: str) -> Dict[str, Any]:
        """Send query to Bedrock Claude 3"""
        tools = build_tool_definitions()
        
        messages = [
            *FEW_SHOT_EXAMPLES,
            {
                "role": "user",
                "content": f"Available database schema:\n{schema_context}\n\nUser question: {question}"
            }
        ]
        
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "system": SYSTEM_PROMPT,
            "messages": messages,
            "tools": tools,
            "temperature": 0
        }
        
        try:
            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=json.dumps(body)
            )
            
            response_body = json.loads(response['body'].read())
            
            # Handle tool use
            if response_body['stop_reason'] == 'tool_use':
                tool_use = next(
                    (c for c in response_body['content'] if c['type'] == 'tool_use'),
                    None
                )
                if tool_use:
                    return {
                        "tool": tool_use['name'],
                        "input": tool_use['input']
                    }
            
            # Handle text response (clarification)
            text_content = next(
                (c for c in response_body['content'] if c['type'] == 'text'),
                None
            )
            if text_content:
                return {"clarify": text_content['text']}
            
            raise Exception("Unexpected response format")
            
        except Exception as e:
            logger.error(f"Bedrock error: {e}")
            raise Exception(f"Bedrock API error: {e}")
    
    async def generate_summary(
        self,
        question: str,
        sql: str,
        results: Dict[str, Any],
        explanation: str
    ) -> str:
        """Generate natural language summary"""
        # Similar implementation to TypeScript version
        pass
```

## 📦 Dependencies

### Backend (`backend/requirements.txt`)

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
asyncpg==0.29.0
boto3==1.29.0
python-dotenv==1.0.0
pydantic==2.4.2
slowapi==0.1.9
python-multipart==0.0.6
httpx==0.25.0
```

### MCP Tool Server (`mcp_tool_server/requirements.txt`)

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
asyncpg==0.29.0
python-dotenv==1.0.0
```

## 🐳 Docker Configuration

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose ports
EXPOSE 8000 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🚀 Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python database/migrate.py

# Seed database
python database/seed.py

# Start backend
uvicorn backend.app.main:app --reload --port 8000

# Start MCP tool server
uvicorn mcp_tool_server.app.server:app --reload --port 8001
```

## 🧪 Testing with pytest

```python
# tests/test_sql_validator.py
import pytest
from backend.app.safety.sql_validator import SQLValidator


@pytest.fixture
def validator():
    return SQLValidator()


def test_allow_select_query(validator):
    sql = "SELECT * FROM customers LIMIT 10"
    result = validator.validate(sql)
    assert result.is_valid is True


def test_block_drop_statement(validator):
    sql = "DROP TABLE orders"
    result = validator.validate(sql)
    assert result.is_valid is False
    assert "DROP" in result.error
```

## 📝 Key Differences from TypeScript

1. **Async/Await**: Use `async`/`await` throughout with `asyncpg`
2. **Type Hints**: Use Python type hints instead of TypeScript types
3. **Pydantic**: Use Pydantic models for request/response validation
4. **FastAPI Dependency Injection**: Use FastAPI's dependency system
5. **boto3**: Use boto3 for AWS Bedrock instead of AWS SDK for JavaScript
6. **asyncpg**: Use asyncpg for async PostgreSQL instead of pg
7. **pytest**: Use pytest for testing instead of Jest

## 🔗 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [asyncpg Documentation](https://magicstack.github.io/asyncpg/)
- [boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [Pydantic Documentation](https://docs.pydantic.dev/)

---

This architecture provides the same functionality as the TypeScript implementation while leveraging Python's async ecosystem and FastAPI's modern features.
