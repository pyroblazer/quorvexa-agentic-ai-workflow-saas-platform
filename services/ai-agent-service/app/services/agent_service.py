import time
from typing import Any

import structlog
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.memory import ConversationBufferWindowMemory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from prometheus_client import Counter, Histogram

from app.config import settings
from app.services.tools import get_available_tools
from app.services.vector_store import VectorStoreService

logger = structlog.get_logger()

# Prometheus metrics for AI usage tracking
ai_request_duration = Histogram(
    "ai_request_duration_seconds",
    "Duration of AI agent requests",
    ["model", "operation"],
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30, 60],
)
ai_request_total = Counter(
    "ai_requests_total",
    "Total AI agent requests",
    ["model", "operation", "status"],
)
ai_tokens_used = Counter(
    "ai_tokens_used_total",
    "Total tokens consumed",
    ["model", "type"],
)


class AgentService:
    def __init__(self) -> None:
        self.vector_store = VectorStoreService()
        self._llm = self._build_llm()

    def _build_llm(self) -> ChatOpenAI:
        # Uses OpenAI-compatible API — works with Ollama locally or OpenAI cloud
        return ChatOpenAI(
            model=settings.llm_model,
            base_url=settings.openai_base_url,
            api_key=settings.openai_api_key or "ollama",
            temperature=settings.temperature,
            max_tokens=settings.max_tokens,
            streaming=True,
        )

    async def run(
        self,
        prompt: str,
        session_id: str,
        config: dict[str, Any],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        start = time.time()
        model_name = settings.llm_model

        try:
            tools = get_available_tools()

            # Window memory keeps last N conversation turns — prevents context overflow
            memory = ConversationBufferWindowMemory(
                memory_key="chat_history",
                return_messages=True,
                k=10,
                output_key="output",
            )

            system_prompt = config.get(
                "system_prompt",
                "You are a helpful AI assistant for the Quorvexa workflow platform. "
                "Help users automate their business workflows efficiently.",
            )

            prompt_template = ChatPromptTemplate.from_messages(
                [
                    ("system", system_prompt),
                    MessagesPlaceholder("chat_history"),
                    ("human", "{input}"),
                    MessagesPlaceholder("agent_scratchpad"),
                ]
            )

            agent = create_openai_tools_agent(self._llm, tools, prompt_template)
            executor = AgentExecutor(
                agent=agent,
                tools=tools,
                memory=memory,
                verbose=settings.environment == "development",
                max_iterations=config.get("max_iterations", 10),
                return_intermediate_steps=True,
            )

            result = await executor.ainvoke(
                {
                    "input": prompt,
                    "context": context,
                }
            )

            duration = time.time() - start
            ai_request_duration.labels(model=model_name, operation="agent_run").observe(duration)
            ai_request_total.labels(model=model_name, operation="agent_run", status="success").inc()

            logger.info("Agent run completed", session_id=session_id, duration=duration)

            return {
                "output": result["output"],
                "intermediate_steps": [
                    {"tool": step[0].tool, "input": step[0].tool_input, "output": step[1]}
                    for step in result.get("intermediate_steps", [])
                ],
                "session_id": session_id,
                "model": model_name,
                "duration_seconds": duration,
            }

        except Exception as e:
            duration = time.time() - start
            ai_request_total.labels(model=model_name, operation="agent_run", status="error").inc()
            logger.error("Agent run failed", session_id=session_id, error=str(e), exc_info=True)
            raise

    async def embed_and_store(self, content: str, metadata: dict[str, Any]) -> str:
        """Store content in vector DB for agent memory/retrieval."""
        return await self.vector_store.upsert(content, metadata)

    async def search_memory(
        self,
        query: str,
        tenant_id: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        """Retrieve relevant memories from vector DB for RAG."""
        return await self.vector_store.search(query, filters={"tenant_id": tenant_id}, limit=limit)
