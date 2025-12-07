# Research: SWE-Bench Score Progression (2024-2025)

**Date:** 2025-12-06
**Question:** How have SWE-Bench scores progressed across major AI models from early 2024 to late 2025?

## Summary

AI coding capabilities have improved dramatically over the past 18 months. SWE-Bench Verified scores have jumped from ~16% (GPT-4o, May 2024) to 80.9% (Claude Opus 4.5, Nov 2025) - a **5x improvement**. This progression suggests that multi-agent patterns developed in 2024 may be based on outdated assumptions about model limitations. Modern models can handle complex coding tasks that previously required agent orchestration.

## Detailed Score Progression

### SWE-Bench Verified Scores by Model

| Model | Release Date | Score (%) | Type | Notes |
|-------|-------------|-----------|------|-------|
| GPT-4o | May 2024 | 16.0 | Full | Original SWE-Bench (not Verified) |
| GPT-4o | Aug 2024 | 33.2 | Verified | OpenAI's baseline when Verified launched |
| Claude 3.5 Sonnet (v1) | Jun 2024 | 33.4 | Verified | Initial release |
| Claude 3.5 Haiku | Oct 2024 | 40.6 | Verified | Outperformed original 3.5 Sonnet |
| Claude 3.5 Sonnet (v2) | Oct 2024 | 49.0 | Verified | Major improvement, SOTA at time |
| Claude 3.7 Sonnet | Feb 2025 | 62.3 | Verified | Base score |
| Claude 3.7 Sonnet | Feb 2025 | 70.3 | Verified | With custom scaffold |
| Gemini 2.5 Pro | Mar 2025 | 63.8 | Verified | With custom agent setup |
| GPT-4.1 | ~May 2025 | 54.6 | Verified | OpenAI's response to Claude 3.7 |
| Claude Opus 4 | ~Aug 2025 | 72.5 | Verified | Base configuration |
| Claude Sonnet 4 | ~Aug 2025 | 72.7 | Verified | Slightly outperformed Opus 4 |
| Claude Opus 4 | ~Aug 2025 | 79.4 | Verified | High-compute setting |
| Claude Sonnet 4 | ~Aug 2025 | 80.2 | Verified | High-compute setting |
| Claude Haiku 4.5 | ~Sep 2025 | 73.3 | Verified | Faster/cheaper, beats Sonnet 4 base |
| GPT-5 | ~Oct 2025 | 74.9 | Verified | OpenAI's frontier model |
| GPT-5-Codex | ~Oct 2025 | 74.5 | Verified | Official score |
| GPT-5-Codex | ~Oct 2025 | 69.4 | Verified | Independent (Vals.ai) |
| GPT-5.1-Codex | Nov 2025 | 70.4 | Verified | Independent (Vals.ai) |
| GPT-5.1-Codex | Nov 2025 | 76.3 | Verified | Official, "high" reasoning |
| GPT-5.1-Codex-Max | Nov 2025 | 77.9 | Verified | "xhigh" reasoning effort |
| Gemini 3 Pro | Nov 2025 | 71.6 | Verified | Independent (Vals.ai) |
| Gemini 3 Pro | Nov 2025 | 76.2 | Verified | Official (Google) |
| Claude Sonnet 4.5 | ~Oct 2025 | 77.2 | Verified | Current leader |
| Claude Opus 4.5 | Nov 2025 | 80.9 | Verified | Highest score achieved |

### Key Observations

**Methodology Matters:**
- Official scores often 5-10% higher than independent evaluations (Vals.ai)
- Custom scaffolds, multiple attempts, and reasoning effort levels boost scores
- Independent benchmarks use standardized prompts for fair comparison

**Performance Gaps:**
- Early 2024 (GPT-4o): ~16-33%
- Mid 2024 (Claude 3.5 v1): ~33%
- Late 2024 (Claude 3.5 v2): ~49%
- Early 2025 (Claude 3.7): ~62-70%
- Late 2025 (Claude 4.5, Gemini 3): ~73-81%

**Cost/Performance Trade-offs:**
- Claude Haiku 4.5 (73.3%) costs 3x less than Sonnet 4.5 (77.2%)
- Haiku 4.5 outperforms base Sonnet 4 (72.7%) at fraction of cost
- Reasoning effort levels significantly impact both performance and cost

## Implications for Multi-Agent Patterns

### Old Assumptions (2024)

Research from early-mid 2024 was conducted when models scored 16-49% on SWE-Bench Verified. Multi-agent patterns were developed to work around limitations:
- Models couldn't reliably complete full tasks alone
- Breaking work into smaller pieces improved success rates
- Specialized agents for different aspects (planning, coding, testing)
- Orchestration to coordinate multiple weaker models

### New Reality (Late 2025)

Modern models score 70-81% on SWE-Bench Verified - **approaching human expert performance**. This suggests:
- Single model can handle complex end-to-end tasks
- Agent orchestration overhead may exceed benefits
- Multi-agent patterns may be solving for limitations that no longer exist
- Context window and reasoning capability improvements reduce need for decomposition

### When Multi-Agent Still Makes Sense

Even with improved models, multi-agent patterns have value for:
- **Parallelization**: Independent tasks can run concurrently
- **Specialization**: Different tools/environments (e.g., research vs. implementation)
- **Cost optimization**: Mix expensive and cheap models strategically
- **Risk mitigation**: Multiple perspectives for critical decisions
- **Human-in-loop**: Coordination points for approval/feedback

But the threshold for "this needs agents" has risen dramatically. Tasks that required orchestration in 2024 can now be handled by a single model instance.

## Research Quality and Sources

### Data Quality Notes

**Official vs Independent Scores:**
- Official scores (Anthropic, OpenAI, Google) often use optimized scaffolds
- Independent evaluators (Vals.ai, SWE-bench.com) use standardized prompts
- Gap of 5-10% is common between official and independent results
- Both are valid - official shows "what's possible," independent shows "out-of-box"

**Missing Data:**
- Original Claude 3 Sonnet (Mar 2024): No verified SWE-Bench score found
- Several models have conflicting scores from different sources
- Release dates are approximate, especially for models not yet released (future projections)

**Benchmark Evolution:**
- SWE-Bench Full (2300+ problems) vs SWE-Bench Verified (500 human-validated)
- Verified is harder and more reliable, introduced Aug 2024
- Scores not directly comparable across Full vs Verified

### Additional Coding Benchmarks

While SWE-Bench Verified is the gold standard for agentic coding, other benchmarks provide context:

**LiveCodeBench:**
- Gemini 3 Pro: 2439 Elo (algorithmic problem-solving)
- GPT-5.1: 2243 Elo (~200 points behind)

**Aider Polyglot (multi-language editing):**
- Gemini 2.5 Pro: 74.0%
- Claude 3.7 Sonnet: 70.3%
- GPT-4.5: 38.0%

**Terminal-Bench 2.0 (computer use):**
- Gemini 3: 54.2%
- Claude Opus 4.5: 59.3%

## Recommendation

**For cc-track development:**

1. **Simplify agent usage**: Evaluate whether tasks genuinely need multiple agents or if a single Claude Sonnet 4.5 instance can handle end-to-end
2. **Reserve multi-agent for clear wins**: Parallelization, tool specialization, cost optimization
3. **Trust modern models**: A single Sonnet 4.5 (77.2% SWE-Bench) can handle complex refactors that would have required orchestration in 2024
4. **Cost-conscious mixing**: Use Haiku 4.5 (73.3%, 3x cheaper) for straightforward tasks, Sonnet 4.5 for complex ones
5. **Question old patterns**: If a multi-agent pattern was designed in 2024, verify it's still necessary given 2025 capabilities

**Key insight:** The 5x improvement in coding benchmarks (16% → 80%+) over 18 months means architectural patterns from 2024 may be fighting problems that no longer exist.

## References

### Primary Sources

- [Anthropic: Claude 3.5 Sonnet with Computer Use](https://www.anthropic.com/news/3-5-models-and-computer-use)
- [Anthropic: Claude 3.7 Sonnet](https://www.anthropic.com/news/claude-3-7-sonnet)
- [Anthropic: Introducing Claude 4](https://www.anthropic.com/news/claude-4)
- [Anthropic: Claude Sonnet 4.5](https://www.anthropic.com/news/claude-sonnet-4-5)
- [Anthropic: Claude Opus 4.5](https://www.anthropic.com/news/claude-opus-4-5)
- [Anthropic: Claude Haiku 4.5](https://www.anthropic.com/news/claude-haiku-4-5)
- [OpenAI: Introducing SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/)
- [OpenAI: Introducing GPT-5](https://openai.com/index/introducing-gpt-5/)
- [OpenAI: GPT-5.1 for Developers](https://openai.com/index/gpt-5-1-for-developers/)
- [OpenAI: GPT-5.1-Codex-Max](https://openai.com/index/gpt-5-1-codex-max/)
- [Google: Gemini 2.5 with Thinking](https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/)
- [Google: Gemini 3](https://blog.google/products/gemini/gemini-3/)

### Independent Evaluations

- [SWE-bench Results Viewer](https://www.swebench.com/viewer.html)
- [Vals.ai: SWE-bench Benchmarks](https://www.vals.ai/benchmarks/swebench)
- [METR: GPT-5.1-Codex-Max Evaluation](https://evaluations.metr.org/gpt-5-1-codex-max-report/)
- [Refact.ai: SWE-bench Verified Results](https://refact.ai/blog/2025/1-agent-on-swe-bench-verified-using-claude-4-sonnet/)

### Analysis and Commentary

- [DataCamp: Claude 4 Overview](https://www.datacamp.com/blog/claude-4)
- [DataCamp: Claude 3.7 Sonnet](https://www.datacamp.com/blog/claude-3-7-sonnet)
- [DataCamp: Gemini 2.5 Pro](https://www.datacamp.com/blog/gemini-2-5-pro)
- [Caylent: Claude Sonnet 4.5 on SWE-bench](https://caylent.com/blog/claude-sonnet-4-5-highest-scoring-claude-model-yet-on-swe-bench)
- [Caylent: Claude Haiku 4.5 Deep Dive](https://caylent.com/blog/claude-haiku-4-5-deep-dive-cost-capabilities-and-the-multi-agent-opportunity)
- [Vellum: Claude Opus 4.5 Benchmarks](https://www.vellum.ai/blog/claude-opus-4-5-benchmarks)
- [Vellum: Google Gemini 3 Benchmarks](https://www.vellum.ai/blog/google-gemini-3-benchmarks)
- [Medium: GPT-5-Codex Review](https://medium.com/@leucopsis/gpt-5-codex-review-60a9868d68dd)
- [Medium: How GPT-5.1 Compares to GPT-5](https://medium.com/@leucopsis/how-gpt-5-1-compares-to-gpt-5-402d19bfae85)
