/** Pipeline step names shared by client + server. */
export const SCAN_STEPS = {
  IMAGE_PREP: "image_prep",
  IMAGE_UPLOAD: "image_upload",
  AUTH_CHECK: "auth_check",
  ROSTER_LOAD: "roster_load",
  OCR_EXTRACTION: "ocr_extraction",
  CLAUDE_VISION: "claude_vision",
  CLAUDE_TEXT: "claude_text",
  STAT_PARSING: "stat_parsing",
  PREVIEW_GENERATION: "preview_generation",
  DATABASE_SAVE: "database_save",
};

export function createScanLogger(scanId = "scan") {
  const started = Date.now();
  const steps = [];

  function log(step, status, detail = "") {
    const entry = {
      step,
      status,
      detail: detail ? String(detail) : "",
      ms: Date.now() - started,
      at: new Date().toISOString(),
    };
    steps.push(entry);
    console.log(
      `[stat-sheet:${scanId}] +${entry.ms}ms ${step} → ${status}${detail ? ` (${detail})` : ""}`
    );
    return entry;
  }

  function lastStep() {
    return steps[steps.length - 1]?.step || null;
  }

  function summary() {
    const failed = steps.find((s) => s.status === "error" || s.status === "timeout");
    return {
      scanId,
      steps,
      hungAt: failed?.step || null,
      totalMs: Date.now() - started,
    };
  }

  return { log, steps, lastStep, summary, scanId };
}

export function withTimeout(promise, ms, stepLabel) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${stepLabel} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
