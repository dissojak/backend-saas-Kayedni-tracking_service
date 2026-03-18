# Copilot Instructions - backend-saas-Kayedni-tracking_service

## Purpose
Use these instructions for the Express tracking service that handles events, sessions, analytics, and profile aggregation.

## Core Flow and Layering
- Keep flow strict: route/controller -> service -> model.
- Controllers should coordinate request/response only and delegate business behavior to services.
- Keep persistence and aggregation behavior inside services and models as currently structured.
- Avoid introducing controller-to-model shortcuts.

## Middleware Contract
- Treat middleware order as a guarded contract.
- Do not reorder critical middleware casually, especially fingerprint/context and error handling chain.
- Keep request metadata enrichment in the tracking middleware pipeline.
- Ensure new endpoints preserve existing middleware behavior expectations.

## req.context and Tracking Metadata
- Use req.context as the source of normalized fingerprint/session metadata.
- Do not duplicate context extraction from body or headers in controller logic when req.context already provides it.
- Keep metadata handling consistent across single-event and batch-event paths.

## Validation and Error Conventions
- Use existing validator modules for endpoint input rules.
- Keep response shape consistent with current API conventions.
- Use centralized error handling and avoid ad-hoc response formats.
- Preserve clear status codes and actionable error messages.

## sendBeacon and Auth Compatibility
- Preserve sendBeacon compatibility behavior.
- Keep API-key fallback behavior that supports browser beacon constraints.
- Do not remove compatibility logic unless replaced by a validated equivalent path.

## Code Quality Standards
- Keep modules small and purpose-driven.
- Favor maintainable and performance-aware service logic (especially for high-volume event writes).
- Keep code clean and Sonar-friendly with explicit naming and predictable control flow.
- Reuse utilities for logging, errors, and response shaping.

## Anti-patterns To Avoid
- Reordering middleware without understanding downstream effects.
- Rebuilding fingerprint fields from request body when req.context already exists.
- Letting controllers access models directly.
- Returning inconsistent response envelopes across similar endpoints.
- Breaking sendBeacon/API-key fallback compatibility.
- Spreading validation checks inline in controllers instead of validators.
- Adding hidden side effects that make analytics behavior non-deterministic.

## Change Checklist
- Is middleware order still valid for this route?
- Does controller delegate all business logic to service?
- Is req.context used correctly?
- Are validator and error response conventions preserved?
- Is sendBeacon compatibility unchanged?
