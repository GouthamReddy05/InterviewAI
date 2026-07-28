import logging
from typing import Dict, Optional

import redis
from pydantic import ValidationError

from core.settings import settings
from models.schemas import InterviewSession

logger = logging.getLogger(__name__)


class RedisSessionStore:
    """Thin wrapper around Redis for persisting InterviewSession objects.

    Sessions are serialized to JSON under keys prefixed with
    ``interview_session:`` and expire after ``settings.session_ttl_seconds`` so
    abandoned interviews do not accumulate forever. If Redis is unreachable the
    store degrades to a process-local dict (single-worker development only).
    """

    def __init__(self, url: Optional[str] = None, ttl_seconds: Optional[int] = None):
        self.prefix = "interview_session:"
        self.ttl_seconds = ttl_seconds or settings.session_ttl_seconds
        # Always present so callers never hit AttributeError on the fallback path.
        self._memory_store: Dict[str, str] = {}
        self.client = None
        try:
            client = redis.StrictRedis.from_url(
                url or settings.redis_url or "redis://localhost:6379/0",
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
            client.ping()
            self.client = client
        except Exception as exc:
            logger.warning(
                "Redis connection failed (%s); using in-memory session store. "
                "Sessions will not be shared across workers or survive a restart.",
                exc,
            )

    def _key(self, session_id: str) -> str:
        return f"{self.prefix}{session_id}"

    def set(self, session_id: str, session: InterviewSession) -> None:
        data = session.model_dump_json()
        if self.client:
            try:
                self.client.set(self._key(session_id), data, ex=self.ttl_seconds)
                return
            except redis.RedisError as exc:
                logger.error("Redis SET failed for %s: %s", session_id, exc)
                raise
        self._memory_store[self._key(session_id)] = data

    def get(self, session_id: str) -> Optional[InterviewSession]:
        if self.client:
            try:
                raw = self.client.get(self._key(session_id))
            except redis.RedisError as exc:
                logger.error("Redis GET failed for %s: %s", session_id, exc)
                return None
        else:
            raw = self._memory_store.get(self._key(session_id))

        if raw is None:
            return None
        try:
            return InterviewSession.model_validate_json(raw)
        except ValidationError as exc:
            # A stored session written by an older schema version should not take
            # the whole request down.
            logger.error("Discarding unreadable session %s: %s", session_id, exc)
            return None

    def delete(self, session_id: str) -> None:
        if self.client:
            try:
                self.client.delete(self._key(session_id))
                return
            except redis.RedisError as exc:
                logger.error("Redis DELETE failed for %s: %s", session_id, exc)
                return
        self._memory_store.pop(self._key(session_id), None)

    def all(self) -> Dict[str, InterviewSession]:
        sessions: Dict[str, InterviewSession] = {}
        if self.client:
            try:
                iterator = list(self.client.scan_iter(f"{self.prefix}*"))
            except redis.RedisError as exc:
                logger.error("Redis SCAN failed: %s", exc)
                return sessions
        else:
            iterator = [k for k in self._memory_store if k.startswith(self.prefix)]

        for key in iterator:
            sid = key.split(":", 1)[1]
            session = self.get(sid)
            # Skip entries that expired or failed to parse mid-scan rather than
            # returning None values the caller would have to guard against.
            if session is not None:
                sessions[sid] = session
        return sessions
