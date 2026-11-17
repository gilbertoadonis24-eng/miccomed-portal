"use client";

import { useId, useRef, useState } from "react";
import {
  EXCEL_DOMAINS,
  type ExcelDomainId,
} from "@/lib/intel/excel-domains";

type Props = {
  domain: ExcelDomainId;
  loaded: boolean;
  busy?: boolean;
  onLoadedFile: (domain: ExcelDomainId, file: File) => Promise<void> | void;
  onReset: (domain: ExcelDomainId) => void;
};

export function ExcelSectionActions({
  domain,
  loaded,
  busy,
  onLoadedFile,
  onReset,
}: Props) {
  const meta = EXCEL_DOMAINS[domain];
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    setLocalError(null);
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      setLocalError("Usa un archivo .xlsx (plantilla demo).");
      return;
    }
    try {
      await onLoadedFile(domain, file);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Error al cargar Excel.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="intel-excel-bar">
      <div className="intel-excel-bar__actions">
        <a className="btn secondary" href={meta.href} download={meta.fileName}>
          Descargar plantilla
        </a>
        <label className="btn" htmlFor={inputId} aria-disabled={busy}>
          {busy ? "Cargando…" : "Cargar Excel"}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          disabled={busy}
          onChange={(e) => void onPick(e.target.files?.[0])}
        />
        {loaded ? (
          <button
            type="button"
            className="btn secondary"
            onClick={() => onReset(domain)}
            disabled={busy}
          >
            Restaurar DEMO
          </button>
        ) : null}
        <span className={loaded ? "badge ok" : "badge"}>
          {loaded ? `Excel · ${meta.label}` : "Seed DEMO"}
        </span>
      </div>
      {localError ? <p className="danger intel-excel-bar__err">{localError}</p> : null}
    </div>
  );
}
