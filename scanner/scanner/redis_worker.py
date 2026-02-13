"""
Redis pub/sub worker — bridges the Node.js server with the Python scan engine.

Listens on Redis channel 'scanner:tasks' for scan jobs published by the server,
runs the scan engine, and publishes results back to 'scanner:results'.
"""

import asyncio
import json
import signal
import sys
import threading

import redis

from scanner.config import config
from scanner.engine import ScanEngine
from scanner.logger import setup_logging, logger


class RedisScanWorker:
    """Listens for scan tasks via Redis pub/sub and processes them."""

    def __init__(self) -> None:
        self.redis_client = redis.Redis.from_url(config.redis_url)
        self.pubsub = self.redis_client.pubsub()
        self.running = True

    def start(self) -> None:
        """Start listening for scan tasks."""
        logger.info(
            "Redis scan worker starting",
            redis_url=config.redis_url,
            channel="scanner:tasks",
        )

        self.pubsub.subscribe("scanner:tasks")
        logger.info("Subscribed to scanner:tasks channel, waiting for scan jobs...")

        for message in self.pubsub.listen():
            if not self.running:
                break

            if message["type"] != "message":
                continue

            try:
                data = json.loads(message["data"])
                scan_id = data.get("scanId")
                target = data.get("target")
                profile = data.get("profile", "STANDARD")

                if not scan_id or not target:
                    logger.warning("Invalid scan task — missing scanId or target", data=data)
                    continue

                logger.info(
                    "Received scan task",
                    scan_id=scan_id,
                    target=target,
                    profile=profile,
                )

                # Run scan in a separate thread to not block the listener
                thread = threading.Thread(
                    target=self._run_scan,
                    args=(scan_id, target, profile),
                    daemon=True,
                )
                thread.start()

            except json.JSONDecodeError as e:
                logger.error("Failed to parse scan task", error=str(e))
            except Exception as e:
                logger.error("Error processing scan task", error=str(e))

    def _run_scan(self, scan_id: str, target: str, profile: str) -> None:
        """Run a scan and publish results back to Redis."""
        log = logger.bind(scan_id=scan_id, target=target, profile=profile)
        log.info("Starting scan execution")

        publisher = redis.Redis.from_url(config.redis_url)

        async def progress_callback(progress: int, message: str) -> None:
            """Publish progress updates to Redis."""
            payload = json.dumps({
                "scanId": scan_id,
                "status": "PROGRESS",
                "progress": progress,
                "message": message,
                "currentModule": message,
            })
            publisher.publish("scanner:results", payload)

        try:
            engine = ScanEngine(progress_callback=progress_callback)
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                result = loop.run_until_complete(
                    engine.run_scan(target, profile)
                )
            finally:
                loop.close()

            # Publish completed results
            completion_payload = json.dumps({
                "scanId": scan_id,
                "status": "COMPLETED",
                "assets": result.get("assets", []),
                "findings": result.get("findings", []),
                "summary": result.get("summary", {}),
            })
            publisher.publish("scanner:results", completion_payload)

            log.info(
                "Scan completed successfully",
                assets=len(result.get("assets", [])),
                findings=len(result.get("findings", [])),
            )

        except Exception as e:
            log.error("Scan execution failed", error=str(e))

            failure_payload = json.dumps({
                "scanId": scan_id,
                "status": "FAILED",
                "error": str(e),
            })
            publisher.publish("scanner:results", failure_payload)

        finally:
            publisher.close()

    def stop(self) -> None:
        """Stop the worker."""
        logger.info("Stopping Redis scan worker")
        self.running = False
        self.pubsub.unsubscribe()
        self.pubsub.close()
        self.redis_client.close()


def main() -> None:
    """Entry point for the Redis scan worker."""
    setup_logging()

    worker = RedisScanWorker()

    def handle_signal(signum, frame):
        logger.info("Received shutdown signal")
        worker.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        worker.start()
    except KeyboardInterrupt:
        worker.stop()


if __name__ == "__main__":
    main()
