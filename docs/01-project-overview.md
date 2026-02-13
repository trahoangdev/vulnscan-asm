# 📋 Project Overview — VulnScan ASM

## 1. Tên dự án
**VulnScan ASM** — Vulnerability Scanner & Attack Surface Management Platform

## 2. Tầm nhìn (Vision)
Xây dựng nền tảng quản lý bề mặt tấn công và quét lỗ hổng bảo mật toàn diện, giúp doanh nghiệp SME chủ động phát hiện và khắc phục rủi ro an ninh mạng trước khi bị khai thác.

## 3. Bài toán cần giải quyết (Problem Statement)

### Thực trạng thị trường
- **76%** doanh nghiệp SME không biết đầy đủ tài sản số đang "lộ" ra internet
- **60%** các vụ tấn công nhắm vào lỗ hổng đã có bản vá nhưng chưa được áp dụng
- Chi phí trung bình một vụ data breach: **$4.88M** (IBM 2024)
- Các tool hiện tại (Nessus, Qualys, Acunetix) quá đắt và phức tạp cho SME

### Pain Points của khách hàng mục tiêu
1. **Không biết mình có gì:** Subdomain, API, cloud service phát sinh không kiểm soát
2. **Quét thủ công, không liên tục:** Chỉ pentest 1-2 lần/năm, bỏ sót lỗ hổng mới
3. **Báo cáo khó hiểu:** Kết quả scan kỹ thuật, management không đọc được
4. **Thiếu ưu tiên:** Hàng trăm findings, không biết fix cái nào trước
5. **Compliance pressure:** SOC2, ISO 27001, PCI-DSS yêu cầu vulnerability management

## 4. Giải pháp (Solution)

### Value Proposition
> "Biết rõ bề mặt tấn công — Phát hiện lỗ hổng tự động — Ưu tiên rủi ro thông minh — Đạt compliance dễ dàng"

### Các trụ cột chính
| Trụ cột | Mô tả |
|---|---|
| **Discover** | Tự động phát hiện tất cả tài sản số từ domain gốc |
| **Scan** | Quét lỗ hổng web app, API, infrastructure |
| **Prioritize** | Risk scoring AI-assisted, đề xuất thứ tự fix |
| **Report** | Báo cáo compliance-ready cho cả kỹ thuật và management |
| **Monitor** | Giám sát liên tục, alert khi có thay đổi/lỗ hổng mới |

## 5. Đối tượng khách hàng (Target Users)

### Primary Users
| Persona | Vai trò | Nhu cầu chính |
|---|---|---|
| **Security Engineer** | Trực tiếp sử dụng tool | Quét nhanh, chính xác, ít false positive |
| **DevOps Engineer** | Tích hợp vào CI/CD | API integration, automated scanning |
| **CTO / CISO** | Ra quyết định | Dashboard tổng quan, risk trend, compliance |

### Target Company Profile
- **Quy mô:** 50-500 nhân viên (SME → Mid-market)
- **Ngành:** Fintech, E-commerce, SaaS, Healthcare
- **Khu vực:** Đông Nam Á (primary), Global (secondary)
- **IT maturity:** Có team dev/ops, chưa có security team chuyên biệt

## 6. Mô hình kinh doanh (Business Model)

### Pricing Tiers
| Plan | Giá/tháng | Targets | Features |
|---|---|---|---|
| **Starter** | Free | 1 domain | Asset discovery, basic scan (top 5 vulns), community |
| **Professional** | $99 | 5 domains | Full scan, scheduling, API, email alerts |
| **Business** | $299 | 20 domains | Continuous monitoring, compliance reports, team |
| **Enterprise** | $799+ | Unlimited | Custom rules, SLA, dedicated support, on-prem option |

### Revenue Streams
1. **SaaS Subscription** (primary) — recurring monthly/annual
2. **API Access** — per-scan pricing cho developers
3. **Professional Services** — pentest manual, consulting (phase sau)
4. **Marketplace** — custom scan templates/plugins

## 7. Đối thủ cạnh tranh

### Direct Competitors
| Đối thủ | Điểm mạnh | Điểm yếu | Giá |
|---|---|---|---|
| **Nessus (Tenable)** | Mature, enterprise-grade | Đắt, phức tạp, UI cũ | $3,990/năm |
| **Qualys** | Cloud-native, compliance | Quá nặng cho SME | $2,000+/năm |
| **Acunetix** | Web app scanning tốt | Chỉ web, không ASM | $4,500+/năm |
| **Nuclei** | Open-source, nhanh | Không dashboard, cần CLI | Free |
| **Shodan** | Internet-wide scanning | Passive, không scan vuln | $69-899/tháng |

### Lợi thế cạnh tranh của VulnScan ASM
1. **Developer-first UX** — UI/UX hiện đại, dễ dùng, không cần training
2. **Giá cạnh tranh** — 1/10 giá enterprise tools, phù hợp SME
3. **All-in-one** — ASM + Vuln Scan + Compliance trong 1 platform
4. **Khu vực hóa** — Hiểu context và compliance requirements Đông Nam Á
5. **API-first** — Dễ tích hợp CI/CD, automation

## 8. KPIs & Metrics

### Product Metrics
- **Scan accuracy:** >95% true positive rate
- **Scan speed:** <10 phút cho basic scan 1 domain
- **Asset discovery rate:** >90% subdomain coverage
- **Uptime:** 99.9%

### Business Metrics (Năm 1)
- **Users:** 500 registered, 50 paying
- **MRR:** $5,000-15,000
- **Churn rate:** <5%/tháng
- **NPS:** >40

## 9. Rủi ro & Giải pháp

| Rủi ro | Mức độ | Giải pháp |
|---|---|---|
| False positive cao → mất trust | Cao | Verification layer, confidence scoring |
| Scanning gây sập hệ thống target | Cao | Rate limiting, safe mode, ToS rõ ràng |
| Pháp lý (scan không phép) | Cao | Domain verification bắt buộc |
| Cạnh tranh từ free tools (Nuclei) | Trung bình | Differentiate bằng UX + managed service |
| Scale infrastructure | Trung bình | Queue-based, container isolation |
