import { applyCommand, type Command } from "./commands.ts";
import type { Project } from "./schema.ts";

export interface HistoryState {
  past: Project[];
  present: Project;
  future: Project[];
  /** Consecutive commands sharing this key (e.g. typing in one file) merge into one undo step. */
  coalesceKey: string | undefined;
}

export const HISTORY_LIMIT = 200;

export function createHistory(project: Project): HistoryState {
  return { past: [], present: project, future: [], coalesceKey: undefined };
}

export function execute(
  state: HistoryState,
  command: Command,
  options: { coalesceKey?: string; now?: Date } = {},
): HistoryState {
  const next = applyCommand(state.present, command, options.now);
  if (next === state.present) return state;
  const coalesce = options.coalesceKey !== undefined && options.coalesceKey === state.coalesceKey;
  const past = coalesce ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT);
  return { past, present: next, future: [], coalesceKey: options.coalesceKey };
}

/**
 * Undo/redo restore content but keep the revision counter moving forward, so a
 * revision number always identifies exactly one project state.
 */
function restore(snapshot: Project, current: Project, now: Date): Project {
  return { ...snapshot, revision: current.revision + 1, updatedAt: now.toISOString() };
}

export function undo(state: HistoryState, now = new Date()): HistoryState {
  const previous = state.past.at(-1);
  if (!previous) return state;
  return {
    past: state.past.slice(0, -1),
    present: restore(previous, state.present, now),
    future: [state.present, ...state.future],
    coalesceKey: undefined,
  };
}

export function redo(state: HistoryState, now = new Date()): HistoryState {
  const next = state.future[0];
  if (!next) return state;
  return {
    past: [...state.past, state.present],
    present: restore(next, state.present, now),
    future: state.future.slice(1),
    coalesceKey: undefined,
  };
}

/** Replace the document without an undo step (load, or server-side derived updates). */
export function reset(state: HistoryState, project: Project, keepHistory = false): HistoryState {
  return keepHistory
    ? { ...state, present: project, coalesceKey: undefined }
    : createHistory(project);
}