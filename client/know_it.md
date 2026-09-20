# Cash & Choices: Platform Overview

This document highlights the core features of Cash & Choices, its unique user-centric market positioning, and the scale capabilities of its Vercel-hosted architecture.

## 1. Core Features & Market Uniqueness

Cash & Choices stands out in a crowded market by prioritizing **privacy, education, and transparency** over aggressive monetization and data mining. 

| Feature | Market Standard | Cash & Choices Uniqueness |
| :--- | :--- | :--- |
| **Financial Decision Engine** | Requires bank logins, PAN, or portfolio uploads to generate a profile. | **100% Zero-PII.** Asks 11 behavioral questions to build a highly accurate investor persona without ever touching sensitive data. |
| **Recommendation Engine** | Driven by affiliate commissions and sponsored placements. | **Zero-Affiliate.** Picks are curated objectively based on cost, consistency, and risk-adjusted returns with plain-English reasons for every pick. |
| **Hidden Charges Explorer** | Buried in fine print, PDFs, and obscure terms & conditions. | **Visual & Transparent.** Brings brokerage, GST, expense ratios, and penalties to the forefront before the user commits. |
| **Calculators Hub** | Basic outputs, often used as lead-generation forms demanding an email. | **Local-First & Comprehensive.** Runs offline. Factors in real-world constraints like inflation, tax brackets, and effective returns. |
| **Side-by-Side Comparison** | Often limits comparisons to similar asset classes (e.g., MF vs MF). | **Cross-Asset Comparison.** Compare credit cards, funds, and loans side-by-side with objective decision scores (Risk, Liquidity, Tax). |

> [!TIP]
> **User-Centric Philosophy**
> Traditional apps trade user data for convenience. Cash & Choices flips this model, providing premium institutional-grade decision tooling while guaranteeing that data like salaries, savings, and net worth never leave the user's browser.

---

## 2. Infrastructure & Scale on Vercel

The platform (both frontend and backend) is hosted entirely on **Vercel**, utilizing their Edge Network and Serverless Functions architecture. This ensures high availability and instantaneous global delivery.

### How Many Users Can It Handle?

Because Cash & Choices is built on a serverless paradigm, it does not rely on a traditional fixed server (like an EC2 instance) that crashes when overloaded. It scales automatically based on incoming traffic.

#### Standard Scaling Metrics (Vercel Pro/Enterprise Tier baseline):

- **Concurrent Users:** Virtually unlimited. Serverless functions spin up in milliseconds to handle new requests in parallel.
- **Traffic Capacity:** Easily supports **100,000+ to 1,000,000+ Monthly Active Users (MAUs)** depending on API efficiency and database connections.
- **Bandwidth:** Global CDN absorbs static asset hits (images, CSS, JS), meaning the core frontend can serve thousands of requests per second without breaking a sweat.
- **Compute (Backend APIs):** Vercel can handle thousands of function invocations per second. The primary bottleneck will never be the hosting, but rather downstream third-party APIs (like `mfapi.in` for live NAVs) or your database connection pooling.

> [!NOTE]
> **Performance Optimization**
> Since the calculators and questionnaires are **Local-First** (running directly in the user's browser using React state and localStorage), they consume **zero** backend resources. This dramatically reduces server load, allowing the Vercel backend to comfortably support massive traffic spikes effortlessly.
