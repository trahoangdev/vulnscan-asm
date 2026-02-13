"""Scanner engine main entry point."""

import argparse
import asyncio
import sys

from scanner.config import config
from scanner.engine import ScanEngine
from scanner.logger import setup_logging, logger


async def run_standalone_scan(target: str, profile: str) -> None:
    """Run a scan directly from the command line (standalone mode)."""
    async def progress_callback(progress: int, message: str) -> None:
        print(f"  [{progress:3d}%] {message}")

    engine = ScanEngine(progress_callback=progress_callback)
    result = await engine.run_scan(target, profile)

    # Print summary
    summary = result.get("summary", {})
    print("\n" + "=" * 60)
    print(f"Scan Complete: {target}")
    print(f"Profile: {profile}")
    print(f"Duration: {result['duration_seconds']:.1f}s")
    print(f"Assets Discovered: {len(result['assets'])}")
    print(f"Findings: {summary.get('total_findings', 0)}")
    print(f"Security Score: {summary.get('security_score', 'N/A')}/100")
    print("-" * 60)

    severity_counts = summary.get("severity_counts", {})
    for sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"):
        count = severity_counts.get(sev, 0)
        if count > 0:
            print(f"  {sev}: {count}")

    if result.get("errors"):
        print(f"\nErrors ({len(result['errors'])}):")
        for err in result["errors"]:
            print(f"  - {err}")

    print("=" * 60)


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="VulnScan ASM Scanner Engine")
    subparsers = parser.add_subparsers(dest="command")

    # scan command
    scan_parser = subparsers.add_parser("scan", help="Run a standalone scan")
    scan_parser.add_argument("target", help="Target to scan (domain or IP)")
    scan_parser.add_argument(
        "--profile",
        choices=["QUICK", "STANDARD", "DEEP"],
        default="STANDARD",
        help="Scan profile (default: STANDARD)",
    )

    # worker command
    worker_parser = subparsers.add_parser("worker", help="Start Celery worker")
    worker_parser.add_argument(
        "--concurrency",
        type=int,
        default=config.max_concurrent_scans,
        help="Worker concurrency",
    )

    args = parser.parse_args()
    setup_logging()

    if args.command == "scan":
        logger.info("Running standalone scan", target=args.target, profile=args.profile)
        asyncio.run(run_standalone_scan(args.target, args.profile))

    elif args.command == "worker":
        logger.info("Starting Celery worker")
        from scanner.worker import app

        app.worker_main(
            argv=[
                "worker",
                f"--concurrency={args.concurrency}",
                "--loglevel=info",
                "-Q",
                "scan",
            ]
        )
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
