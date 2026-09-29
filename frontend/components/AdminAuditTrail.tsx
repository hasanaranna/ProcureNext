"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

interface AuditLog {
  log_id: number;
  sequence_number: number;
  event_uuid: string;
  user_id: number | null;
  user_email: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  timestamp: string;
  previous_hash: string;
  payload_hash: string;
  hash_signature: string;
}

interface AuditStats {
  total_logs: number;
  total_outbox_pending: number;
  last_sequence_number: number | null;
  last_log_timestamp: string | null;
  is_chain_healthy: boolean;
  archives_count: number;
}

interface TamperAnomaly {
  sequence_number: number;
  log_id: number | null;
  anomaly_type: string;
  details: string;
}

interface IntegrityReport {
  is_valid: boolean;
  total_records_checked: number;
  anomalies: TamperAnomaly[];
  verification_duration_ms: number;
  verified_at: string;
  message: string;
}

const PAGE_SIZE = 25;
const ACTION_OPTIONS = ["HTTP_POST", "HTTP_PUT", "HTTP_PATCH", "HTTP_DELETE"];

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function formatTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

function actionBadgeClass(action: string) {
  if (action === "HTTP_DELETE") return "badge-rejected";
  if (action === "HTTP_POST") return "badge-approved";
  if (action === "HTTP_PUT" || action === "HTTP_PATCH") return "badge-pending";
  return "badge-draft";
}

export default function AdminAuditTrail() {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/audit/stats", { credentials: "include" });
      if (res.ok) setStats(await res.json());
    } catch {
      // Stats are informational; the log table reports its own errors.
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (actionFilter) params.set("action_type", actionFilter);
    if (entityFilter.trim()) params.set("entity_type", entityFilter.trim());
    if (search.trim()) params.set("search", search.trim());
    try {
      const res = await fetch(`/api/audit/logs?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to load audit logs (${res.status})`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter, search]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/audit/verify", { credentials: "include" });
      if (!res.ok) throw new Error(`Verification failed (${res.status})`);
      setReport(await res.json());
    } catch (err) {
      setReport({
        is_valid: false,
        total_records_checked: 0,
        anomalies: [],
        verification_duration_ms: 0,
        verified_at: new Date().toISOString(),
        message: err instanceof Error ? err.message : "Verification failed",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleProcessOutbox = async () => {
    setProcessing(true);
    setProcessMessage("");
    try {
      const res = await fetch("/api/audit/process-outbox", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(`Processing failed (${res.status})`);
      const data = await res.json();
      setProcessMessage(`${data.processed_records} pending event(s) added to the chain.`);
      await Promise.all([fetchStats(), fetchLogs()]);
    } catch (err) {
      setProcessMessage(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statCards = [
    { label: "Chained Records", value: stats ? stats.total_logs.toLocaleString() : "—" },
    { label: "Pending Events", value: stats ? stats.total_outbox_pending.toLocaleString() : "—" },
    { label: "Last Sequence", value: stats?.last_sequence_number != null ? `#${stats.last_sequence_number}` : "—" },
    { label: "Sealed Archives", value: stats ? stats.archives_count.toLocaleString() : "—" },
  ];

  return (
    <section className="bg-surface rounded border border-subtle overflow-hidden">
      <div className="px-5 py-4 border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-content-primary">Audit Trail</h2>
          <p className="text-xs text-content-secondary mt-0.5">
            Every state-changing request, SHA-256 hash-chained and append-only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats && (
            <span className={`badge-status ${stats.is_chain_healthy ? "badge-approved" : "badge-rejected"}`}>
              <span className="badge-dot" />
              {stats.is_chain_healthy ? "Chain healthy" : "Chain needs attention"}
            </span>
          )}
          <button
            onClick={handleProcessOutbox}
            disabled={processing}
            className="px-3 h-9 rounded text-sm font-medium text-content-secondary bg-app hover:bg-subtle border border-subtle transition disabled:opacity-50 cursor-pointer"
          >
            {processing ? "Processing…" : "Process Pending Events"}
          </button>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded disabled:opacity-50 cursor-pointer"
          >
            {verifying ? "Verifying…" : "Verify Chain"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-subtle">
        {statCards.map((s) => (
          <div key={s.label} className="px-5 py-3 border-r border-subtle last:border-r-0">
            <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">{s.label}</p>
            <p className="text-base font-semibold text-content-primary tabular-nums mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {processMessage && (
        <div className="px-5 py-2.5 border-b border-subtle text-xs text-content-secondary">{processMessage}</div>
      )}

      {report && (
        <div
          className={`px-5 py-3 border-b border-subtle text-sm ${
            report.is_valid ? "bg-status-approved-bg text-status-approved-text" : "bg-status-rejected-bg text-status-rejected-text"
          }`}
        >
          <p className="font-semibold">
            {report.is_valid ? "Integrity verified" : "Integrity check failed"}
            <span className="font-normal">
              {" "}
              — {report.total_records_checked.toLocaleString()} records checked in{" "}
              {report.verification_duration_ms.toFixed(1)} ms · {formatTime(report.verified_at)}
            </span>
          </p>
          <p className="text-xs mt-0.5">{report.message}</p>
          {report.anomalies.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {report.anomalies.slice(0, 10).map((a) => (
                <li key={`${a.sequence_number}-${a.anomaly_type}`} className="font-mono">
                  #{a.sequence_number} {a.anomaly_type}: {a.details}
                </li>
              ))}
              {report.anomalies.length > 10 && <li>…and {report.anomalies.length - 10} more</li>}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={applySearch} className="px-5 py-3 border-b border-subtle flex flex-col md:flex-row gap-2">
        <select
          value={actionFilter}
          onChange={(e) => {
            setPage(1);
            setActionFilter(e.target.value);
          }}
          className="h-9 px-3 border border-subtle rounded bg-surface text-sm text-content-primary"
        >
          <option value="">All actions</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a.replace("HTTP_", "")}
            </option>
          ))}
        </select>
        <input
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          onBlur={() => setPage(1)}
          placeholder="Entity (e.g. tenders, bids)"
          className="h-9 px-3 border border-subtle rounded bg-surface text-sm text-content-primary md:w-56"
        />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search e-mail, path or IP"
          className="h-9 px-3 border border-subtle rounded bg-surface text-sm text-content-primary flex-1"
        />
        <button
          type="submit"
          className="h-9 px-3.5 rounded text-sm font-medium text-content-secondary bg-app hover:bg-subtle border border-subtle cursor-pointer"
        >
          Search
        </button>
      </form>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-10 text-center text-sm text-content-muted">Loading audit trail…</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-status-rejected-text">{error}</div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center text-sm text-content-muted">No audit records match these filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app text-content-secondary uppercase text-xs tracking-wider">
                <th className="px-5 py-2.5 text-left font-medium">Seq</th>
                <th className="px-5 py-2.5 text-left font-medium">Time</th>
                <th className="px-5 py-2.5 text-left font-medium">Actor</th>
                <th className="px-5 py-2.5 text-left font-medium">Action</th>
                <th className="px-5 py-2.5 text-left font-medium">Target</th>
                <th className="px-5 py-2.5 text-left font-medium">Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {logs.map((log) => {
                const expanded = expandedId === log.log_id;
                return (
                  <Fragment key={log.log_id}>
                    <tr
                      onClick={() => setExpandedId(expanded ? null : log.log_id)}
                      className="hover:bg-app transition cursor-pointer"
                    >
                      <td className="px-5 py-2.5 text-content-muted tabular-nums">#{log.sequence_number}</td>
                      <td className="px-5 py-2.5 text-content-secondary whitespace-nowrap">{formatTime(log.timestamp)}</td>
                      <td className="px-5 py-2.5 text-content-primary">{log.user_email || "System"}</td>
                      <td className="px-5 py-2.5">
                        <span className={`badge-status ${actionBadgeClass(log.action_type)}`}>
                          <span className="badge-dot" />
                          {log.action_type.replace("HTTP_", "")}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-content-secondary font-mono text-xs">{log.entity_id}</td>
                      <td className="px-5 py-2.5 text-content-muted font-mono text-xs">{shortHash(log.hash_signature)}</td>
                    </tr>
                    {expanded && (
                      <tr className="bg-app">
                        <td colSpan={6} className="px-5 py-3">
                          <div className="grid md:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1 font-mono break-all">
                              <p><span className="text-content-muted">previous_hash </span>{log.previous_hash}</p>
                              <p><span className="text-content-muted">payload_hash  </span>{log.payload_hash}</p>
                              <p><span className="text-content-muted">signature     </span>{log.hash_signature}</p>
                              <p><span className="text-content-muted">event_uuid    </span>{log.event_uuid}</p>
                              <p><span className="text-content-muted">ip_address    </span>{log.ip_address || "—"}</p>
                            </div>
                            <pre className="bg-surface border border-subtle rounded p-2 overflow-auto max-h-48 text-content-secondary">
                              {JSON.stringify(log.new_values ?? log.old_values ?? {}, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-5 py-3 border-t border-subtle flex items-center justify-between text-xs text-content-secondary">
        <span className="tabular-nums">
          {total.toLocaleString()} record{total === 1 ? "" : "s"} · page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded border border-subtle bg-app hover:bg-subtle disabled:opacity-40 cursor-pointer"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded border border-subtle bg-app hover:bg-subtle disabled:opacity-40 cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
