import json
import uuid
from typing import Optional, Dict

import redis
from pydantic import BaseModel

from models.schemas import InterviewSession
from core.settings import settings

class RedisSessionStore:
    """Thin wrapper around Redis for persisting InterviewSession objects.
    Serializes sessions to JSON; keys are prefixed with ``interview_session:``.
    """

    def __init__(self, url: Optional[str] = None):
        self.prefix = "interview_session:"
        try:
            self.client = redis.StrictRedis.from_url(
                url or settings.redis_url or "redis://localhost:6379/0", decode_responses=True
            )

            self.client.ping()
        except Exception as e:

            print(f"[WARN] Redis connection failed ({e}); using in-memory session store.")
            self.client = None
            self._memory_store: Dict[str, str] = {}

    def _key(self, session_id: str) -> str:
        return f"{self.prefix}{session_id}"

    def set(self, session_id: str, session: InterviewSession) -> None:
        data = session.model_dump_json()
        if self.client:
            self.client.set(self._key(session_id), data)
        else:
            self._memory_store[self._key(session_id)] = data

    def get(self, session_id: str) -> Optional[InterviewSession]:
        if self.client:
            raw = self.client.get(self._key(session_id))
        else:
            raw = self._memory_store.get(self._key(session_id))
        if raw is None:
            return None
        return InterviewSession.model_validate_json(raw)

    def delete(self, session_id: str) -> None:
        if self.client:
            self.client.delete(self._key(session_id))
        else:
            self._memory_store.pop(self._key(session_id), None)

    def all(self) -> Dict[str, InterviewSession]:
        sessions: Dict[str, InterviewSession] = {}
        if self.client:
            iterator = self.client.scan_iter(f"{self.prefix}*")
        else:
            iterator = (k for k in self._memory_store.keys() if k.startswith(self.prefix))
        for key in iterator:
            sid = key.split(":", 1)[1]
            sessions[sid] = self.get(sid)
        return sessions
