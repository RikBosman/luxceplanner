"use client";

import { useCallback, useMemo, useState } from "react";
import {
  canRedo,
  canUndo,
  commit,
  createHistory,
  EditError,
  redo as redoHistory,
  undo as undoHistory,
  type History,
  type ProjectDocument,
} from "@/domain/project";

export type Tool = "select" | "wall" | "door" | "window";
export type Selection = { kind: "wall" | "opening" | "furniture" | "room"; id: string } | null;

interface State {
  history: History<ProjectDocument>;
  /** Tijdelijke versie tijdens slepen; wordt pas bij loslaten één stap in de geschiedenis. */
  draft: ProjectDocument | null;
  selection: Selection;
  tool: Tool;
  message: { tone: "error" | "info"; text: string } | null;
}

function selectionExists(doc: ProjectDocument, sel: Selection): boolean {
  if (!sel) return true;
  const floor = doc.floors[0]!;
  const list = { wall: floor.walls, opening: floor.openings, furniture: floor.furniture, room: floor.rooms }[sel.kind];
  return list.some((x) => x.id === sel.id);
}

export function useEditorState(initial: ProjectDocument) {
  const [state, setState] = useState<State>(() => ({
    history: createHistory(initial),
    draft: null,
    selection: null,
    tool: "select",
    message: null,
  }));

  const doc = state.draft ?? state.history.present;

  /**
   * Voert een bewerking uit als één stap die ongedaan gemaakt kan worden. De functie mag ook
   * { doc, selection } teruggeven om het nieuwe element direct te selecteren.
   */
  const apply = useCallback((fn: (d: ProjectDocument) => ProjectDocument | { doc: ProjectDocument; selection: Selection }) => {
    setState((s) => {
      try {
        const result = fn(s.history.present);
        const [next, selection] = "floors" in result ? [result, s.selection] : [result.doc, result.selection];
        return { ...s, draft: null, history: commit(s.history, next), selection, message: null };
      } catch (e) {
        if (e instanceof EditError) return { ...s, draft: null, message: { tone: "error", text: e.message } };
        throw e;
      }
    });
  }, []);

  /** Tijdens slepen: toon een tussenstand zonder de geschiedenis te vullen. Ongeldige tussenstanden worden genegeerd. */
  const preview = useCallback((fn: (base: ProjectDocument) => ProjectDocument) => {
    setState((s) => {
      try {
        return { ...s, draft: fn(s.history.present), message: null };
      } catch (e) {
        if (e instanceof EditError) return { ...s, message: { tone: "error", text: e.message } };
        throw e;
      }
    });
  }, []);

  const endPreview = useCallback((keep: boolean) => {
    setState((s) => {
      if (!s.draft) return s;
      if (!keep) return { ...s, draft: null };
      return { ...s, draft: null, history: commit(s.history, s.draft) };
    });
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      const history = undoHistory(s.history);
      return { ...s, draft: null, history, selection: selectionExists(history.present, s.selection) ? s.selection : null, message: null };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      const history = redoHistory(s.history);
      return { ...s, draft: null, history, selection: selectionExists(history.present, s.selection) ? s.selection : null, message: null };
    });
  }, []);

  const select = useCallback((selection: Selection) => setState((s) => ({ ...s, selection })), []);
  const setTool = useCallback((tool: Tool) => setState((s) => ({ ...s, tool, selection: tool === "select" ? s.selection : null })), []);
  const notify = useCallback((text: string, tone: "error" | "info" = "error") => setState((s) => ({ ...s, message: { tone, text } })), []);
  const clearMessage = useCallback(() => setState((s) => ({ ...s, message: null })), []);
  /** Vervangt het hele document (bijv. bij herstellen van een lokale back-up); ongedaan te maken. */
  const replace = useCallback((next: ProjectDocument) => setState((s) => ({ ...s, draft: null, history: commit(s.history, next), selection: null })), []);

  return useMemo(
    () => ({
      doc,
      committed: state.history.present,
      isDragging: state.draft !== null,
      selection: state.selection,
      tool: state.tool,
      message: state.message,
      canUndo: canUndo(state.history),
      canRedo: canRedo(state.history),
      apply,
      preview,
      endPreview,
      undo,
      redo,
      select,
      setTool,
      notify,
      clearMessage,
      replace,
    }),
    [doc, state, apply, preview, endPreview, undo, redo, select, setTool, notify, clearMessage, replace],
  );
}

export type EditorApi = ReturnType<typeof useEditorState>;
