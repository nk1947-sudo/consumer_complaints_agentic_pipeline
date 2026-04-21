# FinComplaint AI

**FinComplaint AI** is a zero-cost, agentic AI pipeline for consumer finance complaint triage and resolution drafting. It combines deterministic preprocessing with a LangGraph multi-agent workflow to classify complaints, identify root cause, propose MCP-grounded remediation, draft a compliant customer response, and produce a fully auditable explanation chain — all in a single pipeline invocation.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
  - [Pipeline Stages](#pipeline-stages)
  - [Agent Roles](#agent-roles)
  - [MCP Policy Server](#mcp-policy-server)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [Environment Variables](#environment-variables)
- [CFPB Dataset Setup](#cfpb-dataset-setup)
- [Running the Pipeline](#running-the-pipeline)
  - [Quick Sanity Check](#quick-sanity-check)
  - [Run via Python API](#run-via-python-api)
  - [Run via FastAPI](#run-via-fastapi)
- [Web Application](#web-application)
  - [Backend (FastAPI)](#backend-fastapi)
  - [Frontend (Next.js)](#frontend-nextjs)
  - [Docker Compose (Full Stack)](#docker-compose-full-stack)
- [Tests](#tests)
- [Evaluation Results](#evaluation-results)
- [Phase Completion Status](#phase-completion-status)
- [Local Artifacts](#local-artifacts)

---

## Overview

FinComplaint AI turns a raw consumer complaint into a compliant, explainable recommended action:

1. **Scrubs PII** from the raw complaint text
2. **Classifies** the complaint into a financial product (credit card, mortgage, loan, etc.) and a specific issue type (billing, fraud, payment, etc.) using a two-stage LLM pipeline
3. **Retrieves** similar historical complaints from a local ChromaDB vector index for root-cause diagnosis
4. **Grounds remediation** in SLA / regulatory rules via a local MCP policy server
5. **Drafts** a customer-facing response
6. **Audits** the draft in a compliance loop — rewrites if needed, escalates if unresolvable
7. **Generates** a stage-by-stage explanation chain with full audit provenance

All LLM calls go through **Groq** (free tier). No cloud infrastructure is required for the core pipeline.

---

## Architecture

### Pipeline Stages

```
START
  → intake_processor       (PII scrubber + receipt merge)
  → product_classifier     (Stage-1 LLM: identify financial product)
  → issue_classifier       (Stage-2 LLM: identify issue + severity, conditioned on product)
  → root_cause             (RAG-based diagnosis over local complaint history)
  → remediator             (MCP policy grounding → action plan)
  → response_writer        (draft customer response)
  → response_auditor       (compliance audit — loops back to writer on failure)
       | approved
  → explainer              (audit trail + explanation chain)
END
```

The writer/auditor loop is a **cyclic LangGraph subgraph**. The auditor checks for:
- Missing policy citation labels
- Unsafe tone (e.g., "calm down", "obviously")
- Overcommitment language (e.g., "guarantee", "our fault", "promise")

If any check fails, the draft is rewritten and re-audited. After a configurable maximum of rewrites, the loop escalates instead of spinning indefinitely.

### Agent Roles

| Agent | Module | Role |
|---|---|---|
| `ClassifierAgent` | `src/agents/classifier.py` | Orchestrates two-stage product → issue classification |
| `ProductClassifierAgent` | `src/agents/product_classifier.py` | Stage-1: identifies financial product |
| `IssueClassifierAgent` | `src/agents/issue_classifier.py` | Stage-2: identifies issue + severity conditioned on product |
| `RootCauseAgent` | `src/agents/root_cause.py` | RAG retrieval + LLM synthesis for root-cause diagnosis |
| `RemediatorAgent` | `src/agents/remediator.py` | Fetches SLA/policy via MCP, proposes action plan |
| `WriterAgent` | `src/agents/writer.py` | Drafts compliant customer-facing response |
| `AuditorAgent` | `src/agents/auditor.py` | Compliance audit with deterministic pattern checks + LLM critique |
| `ExplainerAgent` | `src/agents/explainer.py` | Generates final audit trail and stage-by-stage explanation |

### MCP Policy Server

The local **MCP policy server** (`mcp_server/server.py` / `legal_knowledge_mcp/`) exposes:

- `get_sla_requirements` — returns SLA deadlines and applicable regulations for a given issue type and US state code
- `list_tools` — tool discovery endpoint
- `search_regulations` — full-text policy search

The `RemediatorAgent` calls the MCP server before proposing any action. In mock/fallback mode the server returns data from `mcp_server/mock_regulations.json`. The `legal_knowledge_mcp/` package also supports live lookups via `govinfo` and `open_states` APIs when API keys are configured.

Inspect the server directly:

```bash
uv run python mcp_server/server.py --tool get_sla_requirements --issue-type BILLING --state-code CA
```

---

## Project Structure

```
.
├── src/                        # Core pipeline library
│   ├── agents/                 # All LLM agents (classifier, root_cause, remediator, writer, auditor, explainer)
│   ├── graph/                  # LangGraph pipeline definition, state, routing, interrupt handling
│   ├── intake/                 # PII scrubber and receipt-text merge
│   ├── llm/                    # Groq LLM client, model registry, rate limiter
│   ├── schemas/                # Pydantic models for all pipeline outputs
│   ├── tools/                  # Vector search, ChromaDB index, MCP client, audit logger, pipeline logger
│   ├── evaluation/             # Evaluation harness, fairness reporting, taxonomy
│   └── ui/                     # Streamlit dashboard state, review panel, telemetry
│
├── mcp_server/                 # Standalone MCP policy server (mock regulations)
├── legal_knowledge_mcp/        # Full MCP package with live GovInfo/OpenStates sources
│
├── app/                        # Lightweight FastAPI entrypoint (single-file)
│   ├── api.py                  # POST /api/v1/complaints, GET /api/v1/health
│   └── run_logger.py           # Per-run JSONL logger to logs/
│
├── web_application/            # Full production web app
│   ├── backend/                # FastAPI app with auth, MongoDB, Redis, WebSocket
│   │   ├── auth/               # JWT, password hashing, route guards
│   │   ├── routers/            # complaints, admin, teams API routes
│   │   ├── services/           # complaint orchestration, budget, audit, rate limiting
│   │   ├── models/             # MongoDB document models (complaint, user, team, audit)
│   │   └── middleware/         # CSRF, input sanitization, security headers
│   └── frontend/               # Next.js 14 + TypeScript + Tailwind CSS
│       ├── app/                # Next.js app router pages (dashboard, complaints, admin, audit)
│       ├── components/         # Reusable UI components (ComplaintForm, PipelineView, ReviewPanel)
│       ├── hooks/              # React hooks (useComplaint)
│       └── store/              # Zustand state stores (auth, complaints)
│
├── scripts/                    # Dataset build, vector DB seeding, migration, smoke tests
├── tests/                      # Pytest test suite (30+ test files, organized by phase)
├── performance/                # Holdout evaluation runner
├── artifacts/eval/             # Evaluation results (holdout-evaluation.json/md)
├── data/                       # Local datasets (gitignored except .gitkeep)
├── chroma_db/                  # Local ChromaDB vector index (committed index manifest)
├── logs/                       # JSONL pipeline logs (pipeline.jsonl, pipeline_summary.log)
├── config.yaml                 # Project-level config
├── pyproject.toml              # Package metadata, dependencies, tool config
├── docker-compose.yml          # Full-stack Docker Compose (Redis, MongoDB, backend, frontend)
├── Makefile                    # Unix convenience aliases for uv run commands
└── run_pipeline.py             # Top-level pipeline runner script
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.11+ |
| Package manager | `uv` |
| LLM provider | Groq (llama-3.3-70b-versatile → mixtral-8x7b-32768 → llama-3.1-8b-instant) |
| Agent orchestration | LangGraph 0.2+ |
| Vector DB | ChromaDB (local) with `bge-large-en-v1.5` embeddings |
| Data validation | Pydantic v2 |
| Policy server | Custom MCP server (local JSON + optional GovInfo/OpenStates) |
| Audit logging | SQLite (`data/audit.db`) |
| Backend API | FastAPI + Uvicorn |
| Web frontend | Next.js 14, TypeScript, Tailwind CSS |
| Database (web app) | MongoDB Atlas / local MongoDB 7 |
| Cache (web app) | Redis 7 |
| Containerization | Docker + Docker Compose |
| Testing | pytest |
| Linting | ruff |
| Type checking | mypy |

---

## Prerequisites

- **Python 3.11+**
- **`uv`** — package and environment manager: https://docs.astral.sh/uv/
- **Groq API key** — required for live LLM calls (free tier sufficient): https://console.groq.com/
- **Node.js 18+** — required only for the Next.js frontend
- **Docker + Docker Compose** — required only for containerized deployment

---

## Setup

```bash
# Clone and install all Python dependencies
uv sync

# Copy and fill in environment variables
cp .env.example .env
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes (for live LLM) | Groq API key |
| `GROQ_BASE_URL` | No | Override Groq base URL (default: `https://api.groq.com/openai/v1`) |
| `DAILY_TOKEN_BUDGET` | No | Max tokens per day for budget tracking (default: 200000) |
| `MONGODB_URL` | Web app only | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Web app only | MongoDB database name (default: `fincomplaint_ai`) |
| `REDIS_URL` | Web app only | Redis connection URL (default: `redis://localhost:6379/0`) |
| `GOVINFO_API_KEY` | No | GovInfo API key for live federal regulation lookups |
| `OPEN_STATES_API_KEY` | No | OpenStates API key for live state-level policy lookups |
| `HF_TOKEN` | No | HuggingFace token for embedding model API access |

Additional settings recognized by `src/config.py`:
- `DATASET_SEED`, `DATA_DIR`, `CHROMA_DIR`
- `GROQ_TIMEOUT_SECONDS`, `GROQ_MAX_RETRIES`, `GROQ_BACKOFF_BASE_SECONDS`, `GROQ_BACKOFF_MAX_SECONDS`

---

## CFPB Dataset Setup

The pipeline uses CFPB consumer complaint data. You must download the CSV manually.

**Download:**
1. Open the [CFPB Consumer Complaint Database](https://www.consumerfinance.gov/data-research/consumer-complaints/)
2. Download the full CSV export
3. Note the path to the extracted file

**Build local dataset splits:**

```bash
uv run python scripts/build_dataset.py --input "/path/to/complaints.csv"
```

Creates:
- `data/processed/dev.parquet` — 7,000 records (training)
- `data/processed/holdout.parquet` — 2,000 records (evaluation)
- `data/processed/demos.parquet` — 1,000 records (demos)
- `data/processed/metadata.json` — seed, counts, split metadata

**Seed the local vector index:**

```bash
uv run python scripts/seed_vectordb.py
```

Default behavior: reads `data/processed/dev.parquet`, seeds up to 5,000 records into `chroma_db/`. Uses `bge-large-en-v1.5` embeddings via `sentence-transformers`. If `sentence-transformers` or `chromadb` are not installed, falls back to a deterministic hash-based embedding and a JSON flat-file index — Phase 3 retrieval works against both paths.

To install the real embedding stack:

```bash
uv add chromadb sentence-transformers
uv run python scripts/seed_vectordb.py
```

---

## Running the Pipeline

### Quick Sanity Check

```bash
# Cross-platform task runner
uv run python scripts/tasks.py run

# Optional live Groq smoke test
uv run python scripts/smoke_groq.py
```

`smoke_groq.py` exits cleanly if `GROQ_API_KEY` is not set.

### Run via Python API

The pipeline can be invoked programmatically using the LangGraph graph:

```python
from src.graph.pipeline import build_graph, run_complaint

graph = build_graph()
result = run_complaint(graph, complaint_text="I was charged twice on my credit card and never received a written update.", state_code="CA")

print(result["classification"])        # product + issue + severity + compliance_risk
print(result["diagnosis"])             # root-cause with evidence citations
print(result["remediation"])           # MCP-grounded action plan
print(result["response_draft"])        # drafted customer response
print(result["audit_result"])          # compliance audit verdict
print(result["explanation"])           # stage-by-stage audit trail
```

### Run via FastAPI

The lightweight `app/api.py` exposes the pipeline as a REST endpoint:

```bash
uv run uvicorn app.api:app --reload
```

**POST** `http://localhost:8000/api/v1/complaints`

```json
{
  "complaint_text": "I was charged twice on my credit card and never received a written update.",
  "state_code": "CA"
}
```

**GET** `http://localhost:8000/api/v1/health`

Interactive docs: `http://localhost:8000/docs`

---

## Web Application

A full production-grade web application lives in `web_application/`. It adds:
- JWT authentication (access + refresh tokens)
- MongoDB persistence for complaints, users, teams
- Redis-backed rate limiting and session management
- Real-time WebSocket pipeline status updates
- Admin panel (user management, team assignment, budget controls)
- Audit trail UI

### Backend (FastAPI)

```bash
cd web_application/backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API documentation: `http://localhost:8000/docs`

Key endpoints:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/complaints` | Submit a complaint and trigger the AI pipeline |
| `GET` | `/api/v1/complaints/{thread_id}` | Poll complaint status and results |
| `POST` | `/api/v1/complaints/{thread_id}/review` | Submit human reviewer action (approve/edit/reject) |
| `GET` | `/api/v1/complaints/{thread_id}/audit` | Fetch full audit trail |
| `GET` | `/api/v1/budget` | Get global token budget status |
| `WS` | `/api/v1/complaints/{thread_id}/ws` | Real-time pipeline progress updates |

### Frontend (Next.js)

```bash
cd web_application/frontend
npm install
npm run dev
```

Opens at `http://localhost:3000`. Pages:
- `/dashboard` — complaint overview and metrics
- `/complaints` — list and search complaints
- `/complaint/[id]` — individual complaint with pipeline trace, review panel, audit log
- `/audit` — system-wide audit log
- `/admin` — user and team management

### Docker Compose (Full Stack)

Run the complete stack (Redis + MongoDB + FastAPI backend + Next.js frontend) with a single command:

```bash
docker compose up --build
```

First-run admin credentials:
- **Email**: `admin@fincomplaint.ai`
- **Password**: `Admin1234!`

Services:

| Service | Port | Description |
|---|---|---|
| `backend` | 8000 | FastAPI + LangGraph pipeline |
| `frontend` | 3000 | Next.js web UI |
| `redis` | — (internal) | Session cache and rate limiter |
| `mongodb` | — (internal) | Complaint and user persistence |

One-time migration from local MongoDB to Atlas:

```bash
docker compose run --rm migrate
```

---

## Tests

```bash
# Full test suite
uv run pytest -q

# By phase
uv run pytest -q tests/test_data_pipeline.py
uv run pytest -q tests/test_intake_pipeline.py tests/test_classifier_agent.py tests/test_routing_interrupts.py
uv run pytest -q tests/test_root_cause_agent.py tests/test_remediator_mcp.py tests/test_phase3_graph_logging.py
uv run pytest -q tests/test_response_writer.py tests/test_auditor_loop.py tests/test_explainer_agent.py tests/test_phase4_state.py
uv run pytest -q tests/test_evaluation_harness.py tests/test_fairness_report.py tests/test_phase6_reliability.py
```

Linting and type checking:

```bash
uv run ruff check .
uv run mypy src
```

Unix convenience aliases via `make`:

```bash
make test
make lint
make typecheck
```

---

## Evaluation Results

Evaluated on 2,000 holdout complaints from the CFPB dataset. Full results in [artifacts/eval/holdout-evaluation.md](artifacts/eval/holdout-evaluation.md).

### Overall

| Metric | Value |
|---|---:|
| Records | 2,000 |
| Macro F1 | 0.3545 |
| Product Macro F1 | 0.5246 |
| Issue Macro F1 | 0.1843 |
| Exact Match Rate | 0.2230 |

### Product Classification Breakdown

| Label | Support | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| MORTGAGE | 79 | 0.791 | 0.671 | 0.726 |
| OTHER | 1343 | 0.810 | 0.837 | 0.823 |
| MONEY_TRANSFER | 67 | 0.565 | 0.522 | 0.543 |
| CREDIT_CARD | 128 | 0.387 | 0.734 | 0.507 |
| BANK_ACCOUNT | 89 | 0.580 | 0.326 | 0.417 |
| LOAN | 65 | 0.313 | 0.554 | 0.400 |
| DEBT_COLLECTION | 229 | 0.520 | 0.170 | 0.257 |

### Fairness

Exact-match disparity across product groups (baseline: `CREDIT_REPORTING` with 0.272 exact match):

| Group | Exact Match Rate | Disparity Ratio |
|---|---:|---:|
| MORTGAGE | 0.266 | 0.976 |
| CREDIT_CARD | 0.164 | 0.602 |
| LOAN | 0.169 | 0.621 |
| BANK_ACCOUNT | 0.090 | 0.330 |
| MONEY_TRANSFER | 0.090 | 0.329 |
| DEBT_COLLECTION | 0.052 | 0.192 |

---

## Phase Completion Status

| Phase | Name | Status |
|---|---|---|
| 1 | Foundation and Runtime Baseline | Complete |
| 2 | Intake Intelligence and Classification Routing | Complete |
| 3 | Root Cause and MCP-Grounded Remediation | Complete |
| 4 | Response Generation with Compliance Audit Loop | Complete |
| 5 | Streamlit HITL Dashboard | Complete |
| 6 | Evaluation, Fairness, and Robustness | Complete |

---

## Local Artifacts

Generated at runtime — not committed to version control (except the ChromaDB index manifest):

| Path | Description |
|---|---|
| `data/processed/` | Parquet dataset splits and metadata |
| `chroma_db/` | ChromaDB vector index |
| `data/audit.db` | SQLite audit log for all pipeline node decisions |
| `logs/pipeline.jsonl` | Per-run structured JSONL log |
| `logs/pipeline_summary.log` | Human-readable summary log |
| `outputs/pipeline_results.csv` | Batch pipeline output |
#   c o n s u m e r _ c o m p l a i n t s _ a g e n t i c _ p i p e l i n e  
 