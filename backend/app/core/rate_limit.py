from collections import defaultdict
from time import time

from fastapi import HTTPException, status


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, limit: int, window_seconds: int = 60) -> None:
        now = time()
        bucket = [t for t in self._hits[key] if now - t < window_seconds]
        if len(bucket) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Slow down to prevent runaway agent loops.",
            )
        bucket.append(now)
        self._hits[key] = bucket


limiter = SlidingWindowLimiter()
