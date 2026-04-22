"use client";

/**
 * CyberHook super-admin console (blue item 1.4, richer build).
 *
 * Sections:
 *   - Platform KPI strip (total tenants, users, pending, signups 7d)
 *   - Tabs: Pending · All Users · Companies
 *   - Search + status filter (users tab)
 *   - Row actions: Approve / Reject / Deactivate / Reactivate / Copy email
 *   - Company drawer: click a company to see all its users + plan
 *   - Recent admin activity ribbon (last 10)
 *
 * Access is gated by the `SUPER_ADMIN_EMAILS` Convex env var.
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import Link from "next/link";
import {
    Shield01,
    CheckCircle,
    XClose,
    Building02,
    Clock,
    Users01,
    Copy01,
    SlashCircle01,
    RefreshCw01,
    SearchLg,
    ChevronRight,
} from "@untitledui/icons";

import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { InputBase } from "@/components/base/input/input";
import { Tabs, TabList, Tab, TabPanel } from "@/components/application/tabs/tabs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtRelative(ts?: number) {
    if (!ts) return "—";
    const diff = Date.now() - ts;
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return `${Math.floor(diff / 60_000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(ts?: number) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function statusColor(s: string): "success" | "warning" | "error" | "gray" {
    if (s === "approved" || s === "active" || s === "trial") return "success";
    if (s === "pending" || s === "pending_approval" || s === "past_due") return "warning";
    if (s === "rejected" || s === "cancelled") return "error";
    return "gray";
}

function actionLabel(action: string) {
    return (
        {
            "user.approved": "Approved",
            "user.rejected": "Rejected",
            "user.deactivated": "Deactivated",
        } as Record<string, string>
    )[action] ?? action;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminConsolePage() {
    const isAdmin = useQuery(api.superAdmin.isSuperAdmin);

    if (isAdmin === undefined) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <span className="text-sm text-tertiary">Loading…</span>
            </div>
        );
    }
    if (isAdmin === false) {
        return <AccessDenied />;
    }
    return <AdminConsole />;
}

function AccessDenied() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-primary p-4">
            <div className="w-full max-w-md rounded-xl border border-secondary bg-primary p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-100">
                    <Shield01 className="h-6 w-6 text-error-600" />
                </div>
                <h1 className="text-display-xs font-semibold text-primary">Access Restricted</h1>
                <p className="mt-2 text-sm text-tertiary">
                    This console is for CyberHook platform administrators only. Contact ops at{" "}
                    <a href="mailto:support@cyberhook.ai" className="text-brand-600 hover:underline">
                        support@cyberhook.ai
                    </a>
                    .
                </p>
                <Link href="/dashboard" className="mt-6 inline-block">
                    <Button color="secondary">Return to dashboard</Button>
                </Link>
            </div>
        </div>
    );
}

function AdminConsole() {
    const metrics = useQuery(api.superAdmin.platformMetrics);
    const activity = useQuery(api.superAdmin.recentAdminActivity, { limit: 10 });

    const [drawerCompanyId, setDrawerCompanyId] = useState<Id<"companies"> | null>(null);

    return (
        <div className="min-h-screen bg-secondary_subtle p-4 sm:p-8">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Shield01 className="h-5 w-5 text-brand-600" />
                            <h1 className="text-display-sm font-semibold text-primary">
                                CyberHook Admin Console
                            </h1>
                        </div>
                        <p className="mt-1 text-sm text-tertiary">
                            Platform-wide tenant, user, and approval management.
                        </p>
                    </div>
                    <Link href="/dashboard">
                        <Button color="secondary" size="sm">
                            Back to app
                        </Button>
                    </Link>
                </header>

                {/* KPI strip */}
                <KpiStrip metrics={metrics} />

                {/* Tabs */}
                <div className="mt-6 rounded-xl border border-secondary bg-primary shadow-xs">
                    <Tabs>
                        <div className="border-b border-secondary px-4 pt-4">
                            <TabList
                                size="md"
                                type="button-border"
                                items={[
                                    { id: "pending", label: "Pending Review" },
                                    { id: "users", label: "All Users" },
                                    { id: "companies", label: "Companies" },
                                ]}
                            >
                                {(item) => <Tab key={item.id} id={item.id} label={item.label} />}
                            </TabList>
                        </div>

                        <TabPanel id="pending" className="p-4 sm:p-6">
                            <PendingTab />
                        </TabPanel>
                        <TabPanel id="users" className="p-4 sm:p-6">
                            <UsersTab onOpenCompany={setDrawerCompanyId} />
                        </TabPanel>
                        <TabPanel id="companies" className="p-4 sm:p-6">
                            <CompaniesTab onOpenCompany={setDrawerCompanyId} />
                        </TabPanel>
                    </Tabs>
                </div>

                {/* Recent activity */}
                <ActivityRibbon activity={activity ?? []} />
            </div>

            {drawerCompanyId && (
                <CompanyDrawer
                    companyId={drawerCompanyId}
                    onClose={() => setDrawerCompanyId(null)}
                />
            )}
        </div>
    );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

function KpiStrip({
    metrics,
}: {
    metrics: ReturnType<typeof useQuery<typeof api.superAdmin.platformMetrics>>;
}) {
    const cards = [
        {
            label: "Tenants",
            value: metrics?.totalCompanies ?? "—",
            sub:
                metrics !== undefined
                    ? `+${metrics.newCompaniesLast7d} last 7d`
                    : "",
        },
        {
            label: "Total Users",
            value: metrics?.totalUsers ?? "—",
            sub: metrics !== undefined ? `+${metrics.newUsersLast7d} last 7d` : "",
        },
        {
            label: "Pending Review",
            value: metrics?.userStatus.pending ?? "—",
            sub: metrics !== undefined ? `${metrics.userStatus.approved} approved` : "",
            accent: (metrics?.userStatus.pending ?? 0) > 0 ? "warning" : undefined,
        },
        {
            label: "Rejected / Deactivated",
            value:
                metrics !== undefined
                    ? metrics.userStatus.rejected + metrics.userStatus.deactivated
                    : "—",
            sub:
                metrics !== undefined
                    ? `${metrics.userStatus.rejected} rejected · ${metrics.userStatus.deactivated} deactivated`
                    : "",
        },
    ];
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map((c) => (
                <div
                    key={c.label}
                    className={`rounded-xl border bg-primary p-4 shadow-xs ${
                        c.accent === "warning"
                            ? "border-warning-300"
                            : "border-secondary"
                    }`}
                >
                    <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                        {c.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-primary">{c.value}</p>
                    {c.sub && <p className="mt-1 text-xs text-tertiary">{c.sub}</p>}
                </div>
            ))}
        </div>
    );
}

// ─── Pending Tab ──────────────────────────────────────────────────────────────

function PendingTab() {
    const pending = useQuery(api.superAdmin.listPendingAccounts);
    const approve = useMutation(api.superAdmin.approveAccount);
    const reject = useMutation(api.superAdmin.rejectAccount);
    const [busyId, setBusyId] = useState<string | null>(null);

    const handle = async (
        id: Id<"users">,
        name: string,
        op: "approve" | "reject",
    ) => {
        if (op === "reject" && !confirm(`Reject ${name}? They will receive a rejection email.`)) {
            return;
        }
        setBusyId(id);
        try {
            if (op === "approve") await approve({ id });
            else await reject({ id });
            toast.success(`${name} ${op === "approve" ? "approved" : "rejected"}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to ${op}`);
        } finally {
            setBusyId(null);
        }
    };

    if (pending === undefined) {
        return <p className="text-sm text-tertiary">Loading…</p>;
    }
    if (pending.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-secondary p-10 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-success-100">
                    <CheckCircle className="h-5 w-5 text-success-600" />
                </div>
                <p className="text-md font-semibold text-primary">All caught up</p>
                <p className="mt-1 text-sm text-tertiary">
                    No accounts are awaiting review. New signups will appear here.
                </p>
            </div>
        );
    }
    return (
        <ul className="flex flex-col gap-3">
            {pending.map((u) => {
                const name = `${u.firstName} ${u.lastName}`.trim() || u.email;
                const busy = busyId === u._id;
                return (
                    <li
                        key={u._id}
                        className="rounded-lg border border-secondary bg-primary p-4 shadow-xs"
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
                                    <Building02 className="h-5 w-5 text-brand-600" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-md font-semibold text-primary">{name}</span>
                                        <Badge size="sm" color="gray">
                                            {u.role.replace("_", " ")}
                                        </Badge>
                                        {u.company && (
                                            <Badge size="sm" color="brand">{u.company.name}</Badge>
                                        )}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tertiary">
                                        <span className="truncate">{u.email}</span>
                                        {u.company?.industry && <span>· {u.company.industry}</span>}
                                        {u.company?.planId && <span>· {u.company.planId}</span>}
                                        <span className="inline-flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {fmtRelative(u.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <RowActions
                                busy={busy}
                                canApprove
                                canReject
                                canCopyEmail
                                email={u.email}
                                onApprove={() => handle(u._id, name, "approve")}
                                onReject={() => handle(u._id, name, "reject")}
                            />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({
    onOpenCompany,
}: {
    onOpenCompany: (id: Id<"companies">) => void;
}) {
    const [status, setStatus] = useState<
        "pending" | "approved" | "rejected" | "deactivated" | "all"
    >("all");
    const [search, setSearch] = useState("");

    const users = useQuery(api.superAdmin.listAllAccounts, {
        status: status === "all" ? undefined : status,
        search: search.trim() || undefined,
    });

    const approve = useMutation(api.superAdmin.approveAccount);
    const reject = useMutation(api.superAdmin.rejectAccount);
    const deactivate = useMutation(api.superAdmin.deactivateAccount);
    const reactivate = useMutation(api.superAdmin.reactivateAccount);
    const [busyId, setBusyId] = useState<string | null>(null);

    const run = async (
        id: Id<"users">,
        name: string,
        op: "approve" | "reject" | "deactivate" | "reactivate",
    ) => {
        const confirmCopy: Record<string, string> = {
            reject: `Reject ${name}? They will receive a rejection email.`,
            deactivate: `Deactivate ${name}? They will lose access immediately.`,
        };
        if (confirmCopy[op] && !confirm(confirmCopy[op])) return;
        setBusyId(id);
        try {
            const fn = { approve, reject, deactivate, reactivate }[op];
            await fn({ id });
            // Hand-mapped past-tense — naive `${op}d` produces "rejectd".
            const pastTense: Record<typeof op, string> = {
                approve: "approved",
                reject: "rejected",
                deactivate: "deactivated",
                reactivate: "reactivated",
            };
            toast.success(`${name} ${pastTense[op]}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to ${op}`);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Filter bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    {(["all", "pending", "approved", "rejected", "deactivated"] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                                status === s
                                    ? "border-brand-solid bg-brand-primary_alt text-brand-secondary"
                                    : "border-secondary bg-primary text-secondary hover:bg-secondary_subtle"
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div className="w-full sm:w-72">
                    <InputBase
                        aria-label="Search users"
                        placeholder="Search name, email, company…"
                        icon={SearchLg}
                        value={search}
                        onChange={(v: string) => setSearch(v)}
                    />
                </div>
            </div>

            {users === undefined ? (
                <p className="text-sm text-tertiary">Loading…</p>
            ) : users.length === 0 ? (
                <p className="text-sm text-tertiary">No users match the current filter.</p>
            ) : (
                <div className="overflow-hidden rounded-lg border border-secondary">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-secondary_subtle text-xs font-semibold uppercase tracking-wide text-tertiary">
                            <tr>
                                <th className="px-4 py-2.5">User</th>
                                <th className="px-4 py-2.5">Company</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-4 py-2.5">Created</th>
                                <th className="px-4 py-2.5">Last Active</th>
                                <th className="px-4 py-2.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary bg-primary">
                            {users.map((u) => {
                                const name = `${u.firstName} ${u.lastName}`.trim() || u.email;
                                const busy = busyId === u._id;
                                return (
                                    <tr key={u._id}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-primary">{name}</div>
                                            <div className="text-xs text-tertiary">{u.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {u.company ? (
                                                <button
                                                    onClick={() => onOpenCompany(u.company!._id)}
                                                    className="inline-flex items-center gap-1 text-secondary hover:text-brand-600 hover:underline"
                                                >
                                                    {u.company.name}
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </button>
                                            ) : (
                                                <span className="text-tertiary">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge size="sm" color={statusColor(u.status)}>
                                                {u.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-tertiary">
                                            {fmtDate(u.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-tertiary">
                                            {fmtRelative(u.lastAccessedAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end">
                                                <RowActions
                                                    busy={busy}
                                                    compact
                                                    email={u.email}
                                                    canApprove={
                                                        u.status === "pending" || u.status === "rejected"
                                                    }
                                                    canReject={u.status === "pending"}
                                                    canDeactivate={u.status === "approved"}
                                                    canReactivate={u.status === "deactivated"}
                                                    canCopyEmail
                                                    onApprove={() => run(u._id, name, "approve")}
                                                    onReject={() => run(u._id, name, "reject")}
                                                    onDeactivate={() => run(u._id, name, "deactivate")}
                                                    onReactivate={() => run(u._id, name, "reactivate")}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Companies Tab ────────────────────────────────────────────────────────────

function CompaniesTab({
    onOpenCompany,
}: {
    onOpenCompany: (id: Id<"companies">) => void;
}) {
    const [search, setSearch] = useState("");
    const companies = useQuery(api.superAdmin.listAllCompanies, {
        search: search.trim() || undefined,
    });

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
                <div className="w-full sm:w-72">
                    <InputBase
                        aria-label="Search companies"
                        placeholder="Search company, industry, plan…"
                        icon={SearchLg}
                        value={search}
                        onChange={(v: string) => setSearch(v)}
                    />
                </div>
            </div>

            {companies === undefined ? (
                <p className="text-sm text-tertiary">Loading…</p>
            ) : companies.length === 0 ? (
                <p className="text-sm text-tertiary">No companies match the search.</p>
            ) : (
                <div className="overflow-hidden rounded-lg border border-secondary">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-secondary_subtle text-xs font-semibold uppercase tracking-wide text-tertiary">
                            <tr>
                                <th className="px-4 py-2.5">Company</th>
                                <th className="px-4 py-2.5">Plan / Status</th>
                                <th className="px-4 py-2.5">Users</th>
                                <th className="px-4 py-2.5">Redrok</th>
                                <th className="px-4 py-2.5">Created</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary bg-primary">
                            {companies.map((c) => (
                                <tr key={c._id}>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-primary">{c.name}</div>
                                        <div className="text-xs text-tertiary">
                                            {[c.industry, c.country].filter(Boolean).join(" · ") || "—"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Badge size="sm" color={statusColor(c.status)}>
                                                {c.status}
                                            </Badge>
                                            {c.planId && (
                                                <span className="text-xs text-tertiary">{c.planId}</span>
                                            )}
                                        </div>
                                        {c.trialEndsAt && (
                                            <div className="mt-0.5 text-xs text-tertiary">
                                                Trial ends {fmtDate(c.trialEndsAt)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1 text-secondary">
                                            <Users01 className="h-3.5 w-3.5" />
                                            {c.approvedUsers}/{c.userCount}
                                        </span>
                                        {c.pendingUsers > 0 && (
                                            <span className="ml-2 text-xs text-warning-700">
                                                {c.pendingUsers} pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {c.redrokLinked ? (
                                            <Badge size="sm" color="success">Linked</Badge>
                                        ) : (
                                            <Badge size="sm" color="gray">—</Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-tertiary">
                                        {fmtDate(c.createdAt)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            size="sm"
                                            color="link-color"
                                            onClick={() => onOpenCompany(c._id)}
                                        >
                                            View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Row Actions ──────────────────────────────────────────────────────────────

function RowActions({
    busy,
    compact,
    email,
    canApprove,
    canReject,
    canDeactivate,
    canReactivate,
    canCopyEmail,
    onApprove,
    onReject,
    onDeactivate,
    onReactivate,
}: {
    busy: boolean;
    compact?: boolean;
    email?: string;
    canApprove?: boolean;
    canReject?: boolean;
    canDeactivate?: boolean;
    canReactivate?: boolean;
    canCopyEmail?: boolean;
    onApprove?: () => void;
    onReject?: () => void;
    onDeactivate?: () => void;
    onReactivate?: () => void;
}) {
    const btnSize = compact ? "sm" : "sm";
    return (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {canCopyEmail && email && (
                <button
                    title="Copy email"
                    onClick={() => {
                        navigator.clipboard.writeText(email);
                        toast.success("Email copied");
                    }}
                    className="inline-flex items-center justify-center rounded-md p-1.5 text-quaternary hover:text-brand-600 hover:bg-secondary_subtle transition"
                >
                    <Copy01 className="h-4 w-4" />
                </button>
            )}
            {canReactivate && (
                <Button
                    size={btnSize}
                    color="secondary"
                    iconLeading={RefreshCw01}
                    isDisabled={busy}
                    onClick={onReactivate}
                >
                    Reactivate
                </Button>
            )}
            {canDeactivate && (
                <Button
                    size={btnSize}
                    color="secondary"
                    iconLeading={SlashCircle01}
                    isDisabled={busy}
                    onClick={onDeactivate}
                >
                    Deactivate
                </Button>
            )}
            {canReject && (
                <Button
                    size={btnSize}
                    color="secondary"
                    iconLeading={XClose}
                    isDisabled={busy}
                    onClick={onReject}
                >
                    Reject
                </Button>
            )}
            {canApprove && (
                <Button
                    size={btnSize}
                    color="primary"
                    iconLeading={CheckCircle}
                    isDisabled={busy}
                    onClick={onApprove}
                >
                    {busy ? "…" : "Approve"}
                </Button>
            )}
        </div>
    );
}

// ─── Company Drawer ───────────────────────────────────────────────────────────

function CompanyDrawer({
    companyId,
    onClose,
}: {
    companyId: Id<"companies">;
    onClose: () => void;
}) {
    const detail = useQuery(api.superAdmin.getCompanyDetail, { companyId });
    const approve = useMutation(api.superAdmin.approveAccount);
    const reject = useMutation(api.superAdmin.rejectAccount);
    const deactivate = useMutation(api.superAdmin.deactivateAccount);
    const reactivate = useMutation(api.superAdmin.reactivateAccount);
    const [busyId, setBusyId] = useState<string | null>(null);

    const runAction = async (
        id: Id<"users">,
        name: string,
        op: "approve" | "reject" | "deactivate" | "reactivate",
    ) => {
        const confirmCopy: Record<string, string> = {
            reject: `Reject ${name}? They will receive a rejection email.`,
            deactivate: `Deactivate ${name}? They will lose access immediately.`,
        };
        if (confirmCopy[op] && !confirm(confirmCopy[op])) return;
        setBusyId(id);
        try {
            const fn = { approve, reject, deactivate, reactivate }[op];
            await fn({ id });
            const pastTense: Record<typeof op, string> = {
                approve: "approved",
                reject: "rejected",
                deactivate: "deactivated",
                reactivate: "reactivated",
            };
            toast.success(`${name} ${pastTense[op]}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to ${op}`);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex">
            <div
                className="flex-1 bg-gray-900/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <aside className="w-full max-w-lg overflow-y-auto bg-primary shadow-2xl">
                <header className="sticky top-0 flex items-center justify-between border-b border-secondary bg-primary px-5 py-4">
                    <h2 className="text-md font-semibold text-primary">Company Details</h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-quaternary hover:bg-secondary_subtle hover:text-secondary transition"
                    >
                        <XClose className="h-5 w-5" />
                    </button>
                </header>

                {detail === undefined ? (
                    <p className="p-6 text-sm text-tertiary">Loading…</p>
                ) : detail === null ? (
                    <p className="p-6 text-sm text-tertiary">Company not found.</p>
                ) : (
                    <div className="flex flex-col gap-6 p-5">
                        {/* Company summary */}
                        <div>
                            <div className="flex items-center gap-2">
                                <Building02 className="h-5 w-5 text-brand-600" />
                                <h3 className="text-lg font-semibold text-primary">
                                    {detail.company.name}
                                </h3>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                                <KV label="Industry" value={detail.company.industry ?? "—"} />
                                <KV label="Country" value={detail.company.country ?? "—"} />
                                <KV label="Employees" value={detail.company.totalEmployees ?? "—"} />
                                <KV label="Revenue" value={detail.company.annualRevenue ?? "—"} />
                                <KV label="Plan" value={detail.company.planId ?? "—"} />
                                <KV
                                    label="Status"
                                    value={
                                        <Badge size="sm" color={statusColor(detail.company.status)}>
                                            {detail.company.status}
                                        </Badge>
                                    }
                                />
                                <KV
                                    label="Trial ends"
                                    value={fmtDate(detail.company.trialEndsAt)}
                                />
                                <KV
                                    label="Redrok"
                                    value={
                                        detail.company.redrokLinked ? (
                                            <Badge size="sm" color="success">Linked</Badge>
                                        ) : (
                                            <Badge size="sm" color="gray">Not linked</Badge>
                                        )
                                    }
                                />
                                <KV label="Created" value={fmtDate(detail.company.createdAt)} />
                            </div>
                        </div>

                        {/* Users — fully actionable, matches the Users tab */}
                        <div>
                            <h4 className="mb-2 text-sm font-semibold text-primary">
                                Users ({detail.users.length})
                            </h4>
                            <ul className="flex flex-col gap-2">
                                {detail.users.map((u) => {
                                    const name =
                                        `${u.firstName} ${u.lastName}`.trim() || u.email;
                                    const busy = busyId === u._id;
                                    return (
                                        <li
                                            key={u._id}
                                            className="rounded-md border border-secondary bg-secondary_subtle p-3 text-sm"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-medium text-primary">
                                                            {name}
                                                        </span>
                                                        <Badge size="sm" color={statusColor(u.status)}>
                                                            {u.status}
                                                        </Badge>
                                                        <Badge size="sm" color="gray">
                                                            {u.role.replace("_", " ")}
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-0.5 truncate text-xs text-tertiary">
                                                        {u.email} · last active{" "}
                                                        {fmtRelative(u.lastAccessedAt)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex justify-end">
                                                <RowActions
                                                    busy={busy}
                                                    compact
                                                    email={u.email}
                                                    canApprove={
                                                        u.status === "pending" ||
                                                        u.status === "rejected"
                                                    }
                                                    canReject={u.status === "pending"}
                                                    canDeactivate={u.status === "approved"}
                                                    canReactivate={u.status === "deactivated"}
                                                    canCopyEmail
                                                    onApprove={() => runAction(u._id, name, "approve")}
                                                    onReject={() => runAction(u._id, name, "reject")}
                                                    onDeactivate={() =>
                                                        runAction(u._id, name, "deactivate")
                                                    }
                                                    onReactivate={() =>
                                                        runAction(u._id, name, "reactivate")
                                                    }
                                                />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                {label}
            </div>
            <div className="mt-0.5 text-secondary">{value}</div>
        </div>
    );
}

// ─── Activity Ribbon ──────────────────────────────────────────────────────────

function ActivityRibbon({
    activity,
}: {
    activity: Array<{
        _id: string;
        action: string;
        entityId?: string;
        details?: string;
        createdAt: number;
    }>;
}) {
    if (activity.length === 0) return null;
    return (
        <div className="mt-6 rounded-xl border border-secondary bg-primary p-4 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                    Recent Admin Activity
                </span>
            </div>
            <ul className="flex flex-col divide-y divide-secondary">
                {activity.map((a) => (
                    <li
                        key={a._id}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                        <div className="flex items-center gap-2">
                            <Badge size="sm" color={statusColor(a.action.split(".")[1] ?? "")}>
                                {actionLabel(a.action)}
                            </Badge>
                            <span className="text-tertiary">{a.details ?? "—"}</span>
                        </div>
                        <span className="text-xs text-tertiary">{fmtRelative(a.createdAt)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
