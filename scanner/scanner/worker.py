"""Celery worker for processing scan jobs from Redis queue."""

import asyncio
import json
from typing import Any

from celery import Celery
import redis

from scanner.config import config
from scanner.engine import ScanEngine
from scanner.logger import setup_logging, logger


# Initialize Celery
app = Celery(
    "scanner",
    broker=config.redis_url,
    backend=config.redis_url,
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=config.scan_timeout + 60,
    task_soft_time_limit=config.scan_timeout,
    worker_concurrency=config.max_concurrent_scans,
    worker_prefetch_multiplier=1,
)

# Redis client for publishing progress
redis_client = redis.Redis.from_url(config.redis_url)

setup_logging()


@app.task(bind=True, name="scanner.run_scan")
def run_scan_task(
    self,
    scan_id: str,
    target: str,
    profile: str = "STANDARD",
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Execute a vulnerability scan as a Celery task.

    Args:
        scan_id: Unique scan ID from the API server.
        target: Target to scan (domain, IP).
        profile: Scan profile (QUICK, STANDARD, DEEP).
        options: Additional scan options.
    """
    log = logger.bind(scan_id=scan_id, target=target, profile=profile)
    log.info("Scan task started")

    async def progress_callback(progress: int, message: str) -> None:
        """Publish progress to Redis for the API server to consume."""
        payload = json.dumps({
            "scanId": scan_id,
            "progress": progress,
            "message": message,
        })
        redis_client.publish(f"scan:progress:{scan_id}", payload)
        # Also update task state
        self.update_state(
            state="PROGRESS",
            meta={"progress": progress, "message": message},
        )

    try:
        engine = ScanEngine(progress_callback=progress_callback)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                engine.run_scan(target, profile, options)
            )
        finally:
            loop.close()

        # Publish completion
        completion_payload = json.dumps({
            "scanId": scan_id,
            "status": "COMPLETED",
            "result": result,
        })
        redis_client.publish(f"scan:completed:{scan_id}", completion_payload)

        log.info(
            "Scan task completed",
            findings=len(result.get("findings", [])),
            assets=len(result.get("assets", [])),
        )

        return result

    except Exception as e:
        log.error("Scan task failed", error=str(e))

        # Publish failure
        failure_payload = json.dumps({
            "scanId": scan_id,
            "status": "FAILED",
            "error": str(e),
        })
        redis_client.publish(f"scan:failed:{scan_id}", failure_payload)

        raise


@app.task(name="scanner.health_check")
def health_check() -> dict[str, str]:
    """Simple health check task."""
    return {"status": "ok", "service": "scanner"}
