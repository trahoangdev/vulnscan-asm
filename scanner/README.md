# VulnScan ASM - Scanner Engine

Python-based vulnerability scanner engine with modular architecture.

## Setup

```bash
cd scanner
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

## Run

```bash
python -m scanner.main
```

## Modules

- **port_scanner**: TCP/UDP port scanning via nmap
- **web_crawler**: HTTP endpoint discovery
- **vuln_checker**: CVE-based vulnerability detection
- **ssl_analyzer**: SSL/TLS certificate analysis
- **dns_enumerator**: DNS record enumeration
- **tech_detector**: Technology stack fingerprinting
