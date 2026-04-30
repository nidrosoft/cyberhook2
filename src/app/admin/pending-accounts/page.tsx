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
 * Access is gated by the super_admin role or configured platform admin emails.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { useClerk } from "@clerk/nextjs";
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
    Trash01,
    SlashCircle01,
    RefreshCw01,
    SearchLg,
    LogOut01,
    CurrencyDollar,
} from "@untitledui/icons";

import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { InputBase } from "@/components/base/input/input";
import { Tabs, TabList } from "@/components/application/tabs/tabs";
import { ConfirmModal } from "@/components/application/modals/confirm-modal";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// ─── Confirm dialog context ──────────────────────────────────────────────────
// Wires the page-level <ConfirmModal /> to any descendant that needs a
// confirm-then-run flow. Children call `requestConfirm({ ..., onConfirm })`
// and the modal handles open/close + busy state automatically.

interface ConfirmRequest {
    title: string;
    description?: ReactNode;
    confirmLabel?: string;
    tone?: "destructive" | "primary";
    onConfirm: () => Promise<void> | void;
}
const ConfirmContext = createContext<((req: ConfirmRequest) => void) | null>(null);
function useRequestConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        throw new Error("useRequestConfirm must be used inside <ConfirmContext.Provider>");
    }
    return ctx;
}

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
            "user.deleted": "Deleted",
        } as Record<string, string>
    )[action] ?? action;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminConsolePage() {
    const isAdmin = useQuery(api.superAdmin.isSuperAdmin);
    const bootstrapSelf = useMutation(api.superAdmin.bootstrapSelf);

    // Idempotent safety net: if a super admin lands here directly (deep link,
    // refresh, etc.) and never went through /admin/session, ensure their
    // Convex record + Clerk metadata exist so admin queries/mutations work.
    useEffect(() => {
        if (isAdmin === true) {
            (async () => {
                try {
                    const { getPlatformAdminProfile } = await import("@/app/actions/clerk");
                    const profile = await getPlatformAdminProfile();
                    await bootstrapSelf({
                        email: profile.email,
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        imageUrl: profile.imageUrl,
                    });
                } catch {
                    /* best-effort safety net */
                }
            })();
        }
    }, [isAdmin, bootstrapSelf]);

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
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link href="/admin/login">
                        <Button>Admin login</Button>
                    </Link>
                    <Link href="/dashboard">
                        <Button color="secondary">Return to dashboard</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function AdminConsole() {
    const metrics = useQuery(api.superAdmin.platformMetrics);
    const activity = useQuery(api.superAdmin.recentAdminActivity, { limit: 10 });
    const { signOut } = useClerk();

    const [drawerCompanyId, setDrawerCompanyId] = useState<Id<"companies"> | null>(null);
    const [activeTab, setActiveTab] = useState<"pending" | "tenants">("pending");

    // Page-level confirm modal state shared via ConfirmContext.
    const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const requestConfirm = useCallback((req: ConfirmRequest) => setConfirmReq(req), []);

    const pendingCount = metrics?.userStatus.pending ?? 0;

    return (
        <ConfirmContext.Provider value={requestConfirm}>
            <div className="min-h-screen bg-secondary_subtle p-4 sm:p-8">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
                    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Shield01 className="h-5 w-5 text-brand-600" />
                                <h1 className="text-display-sm font-semibold text-primary">
                                    CyberHook Admin Console
                                </h1>
                            </div>
                            <p className="mt-1 text-sm text-tertiary">
                                Platform-wide tenant, user, billing, and approval management.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link href="/admin/account">
                                <Button color="secondary" size="sm">
                                    Admin account
                                </Button>
                            </Link>
                            <Link href="/dashboard">
                                <Button color="secondary" size="sm">
                                    Back to app
                                </Button>
                            </Link>
                            <Button
                                color="secondary-destructive"
                                size="sm"
                                iconLeading={LogOut01}
                                onClick={() =>
                                    requestConfirm({
                                        title: "Sign out of admin console?",
                                        description:
                                            "You'll be returned to the admin login page and your current session will end.",
                                        confirmLabel: "Sign out",
                                        tone: "destructive",
                                        onConfirm: () => signOut({ redirectUrl: "/admin/login" }),
                                    })
                                }
                            >
                                Sign out
                            </Button>
                        </div>
                    </header>

                    {/* KPI strip */}
                    <KpiStrip metrics={metrics} />

                    {/* Tabs */}
                    <div className="mt-6 rounded-xl border border-secondary bg-primary shadow-xs">
                        <div className="border-b border-secondary px-4 sm:px-6">
                            <Tabs
                                selectedKey={activeTab}
                                onSelectionChange={(k) => setActiveTab(k as "pending" | "tenants")}
                            >
                                <TabList
                                    size="md"
                                    type="underline"
                                    className="gap-6"
                                    items={[
                                        {
                                            id: "pending",
                                            label:
                                                pendingCount > 0
                                                    ? `Pending Review (${pendingCount})`
                                                    : "Pending Review",
                                        },
                                        { id: "tenants", label: "Tenants & Users" },
                                    ]}
                                />
                            </Tabs>
                        </div>

                        <div className="p-4 sm:p-6">
                            {activeTab === "pending" ? (
                                <PendingTab />
                            ) : (
                                <CompaniesTab onOpenCompany={setDrawerCompanyId} />
                            )}
                        </div>
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

                {/* Page-level confirm modal */}
                <ConfirmModal
                    open={Boolean(confirmReq)}
                    loading={confirmBusy}
                    title={confirmReq?.title ?? ""}
                    description={confirmReq?.description}
                    tone={confirmReq?.tone}
                    confirmLabel={confirmReq?.confirmLabel}
                    onClose={() => {
                        if (!confirmBusy) setConfirmReq(null);
                    }}
                    onConfirm={async () => {
                        if (!confirmReq) return;
                        try {
                            setConfirmBusy(true);
                            await confirmReq.onConfirm();
                        } finally {
                            setConfirmBusy(false);
                            setConfirmReq(null);
                        }
                    }}
                />
            </div>
        </ConfirmContext.Provider>
    );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

function KpiStrip({
    metrics,
}: {
    metrics: ReturnType<typeof useQuery<typeof api.superAdmin.platformMetrics>>;
}) {
    const formatMoney = (n: number) =>
        n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

    type Accent = "warning" | "success" | undefined;
    const cards: Array<{
        label: string;
        value: string | number;
        sub?: string;
        icon: typeof Building02;
        accent?: Accent;
    }> = [
        {
            label: "Tenants & Users",
            value: metrics?.totalCompanies ?? "—",
            sub:
                metrics !== undefined
                    ? `${metrics.totalUsers} users · +${metrics.newCompaniesLast7d} last 7d`
                    : "",
            icon: Building02,
        },
        {
            label: "Pending Review",
            value: metrics?.userStatus.pending ?? "—",
            sub: metrics !== undefined ? `${metrics.userStatus.approved} approved` : "",
            icon: Clock,
            accent: (metrics?.userStatus.pending ?? 0) > 0 ? "warning" : undefined,
        },
        {
            label: "Monthly Revenue",
            value: metrics?.revenue ? formatMoney(metrics.revenue.mrr) : "—",
            sub: metrics?.revenue
                ? `${metrics.revenue.payingCompanies} paying · ${metrics.revenue.trialCompanies} trial · ${formatMoney(metrics.revenue.arr)} ARR`
                : "",
            icon: CurrencyDollar,
            accent: metrics?.revenue && metrics.revenue.mrr > 0 ? "success" : undefined,
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
            icon: SlashCircle01,
        },
    ];
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => {
                const Icon = c.icon;
                const accentBorder =
                    c.accent === "warning"
                        ? "border-warning-300"
                        : c.accent === "success"
                          ? "border-success-300"
                          : "border-secondary";
                const accentIconBg =
                    c.accent === "warning"
                        ? "bg-warning-100 text-warning-600"
                        : c.accent === "success"
                          ? "bg-success-100 text-success-600"
                          : "bg-brand-100 text-brand-600";
                return (
                    <div
                        key={c.label}
                        className={`rounded-xl border bg-primary p-4 shadow-xs ${accentBorder}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                                    {c.label}
                                </p>
                                <p className="mt-2 truncate text-2xl font-semibold text-primary">
                                    {c.value}
                                </p>
                                {c.sub && (
                                    <p className="mt-1 text-xs text-tertiary">{c.sub}</p>
                                )}
                            </div>
                            <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accentIconBg}`}
                            >
                                <Icon className="h-4.5 w-4.5" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Pending Tab ──────────────────────────────────────────────────────────────

function PendingTab() {
    const pending = useQuery(api.superAdmin.listPendingAccounts);
    const approve = useMutation(api.superAdmin.approveAccount);
    const reject = useMutation(api.superAdmin.rejectAccount);
    const requestConfirm = useRequestConfirm();
    const [busyId, setBusyId] = useState<string | null>(null);

    const run = async (id: Id<"users">, name: string, op: "approve" | "reject") => {
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

    const handle = (id: Id<"users">, name: string, op: "approve" | "reject") => {
        if (op === "approve") {
            requestConfirm({
                title: `Approve ${name}?`,
                description:
                    "They will gain access to the platform and receive a welcome email.",
                confirmLabel: "Approve account",
                tone: "primary",
                onConfirm: () => run(id, name, "approve"),
            });
        } else {
            requestConfirm({
                title: `Reject ${name}?`,
                description:
                    "They will receive a rejection email and be unable to sign in. This action is reversible.",
                confirmLabel: "Reject account",
                tone: "destructive",
                onConfirm: () => run(id, name, "reject"),
            });
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

// ─── Tenants Tab (combined Companies + Users view) ────────────────────────────

// Plan price reference for the Tenants table — kept inline so the column
// renders without an extra round-trip. Stays in sync with `convex/superAdmin`.
const TENANT_PLAN_PRICES: Record<string, number> = { solo: 99, growth: 299, scale: 499 };

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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-tertiary">
                    Tenants and their members. Click a row to manage users (approve, reject,
                    deactivate, reactivate, delete).
                </p>
                <div className="w-full sm:w-80">
                    <InputBase
                        aria-label="Search tenants and users"
                        placeholder="Search tenant, user name, email…"
                        icon={SearchLg}
                        value={search}
                        onChange={(v: string) => setSearch(v)}
                    />
                </div>
            </div>

            {companies === undefined ? (
                <p className="text-sm text-tertiary">Loading…</p>
            ) : companies.length === 0 ? (
                <p className="text-sm text-tertiary">No tenants match the search.</p>
            ) : (
                <div className="overflow-hidden rounded-lg border border-secondary">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-secondary_subtle text-xs font-semibold uppercase tracking-wide text-tertiary">
                            <tr>
                                <th className="px-4 py-2.5">Tenant</th>
                                <th className="px-4 py-2.5">Plan / Status</th>
                                <th className="px-4 py-2.5">Revenue</th>
                                <th className="px-4 py-2.5">Users</th>
                                <th className="px-4 py-2.5">Created</th>
                                <th className="px-4 py-2.5" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary bg-primary">
                            {companies.map((c) => {
                                const planPrice = c.planId ? TENANT_PLAN_PRICES[c.planId] ?? 0 : 0;
                                const planActive = c.planStatus === "active";
                                return (
                                    <tr
                                        key={c._id}
                                        className="cursor-pointer transition hover:bg-secondary_subtle"
                                        onClick={() => onOpenCompany(c._id)}
                                    >
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
                                                    <Badge size="sm" color="brand">
                                                        {c.planId}
                                                    </Badge>
                                                )}
                                            </div>
                                            {c.trialEndsAt && (
                                                <div className="mt-0.5 text-xs text-tertiary">
                                                    Trial ends {fmtDate(c.trialEndsAt)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {planActive && planPrice > 0 ? (
                                                <div>
                                                    <div className="font-medium text-primary">
                                                        ${planPrice}
                                                        <span className="text-xs font-normal text-tertiary">/mo</span>
                                                    </div>
                                                    <div className="text-xs text-success-700">
                                                        ${planPrice * 12}/yr
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-tertiary">—</span>
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
                                        <td className="px-4 py-3 text-tertiary">
                                            {fmtDate(c.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                size="sm"
                                                color="link-color"
                                                onClick={(e: React.MouseEvent) => {
                                                    e.stopPropagation();
                                                    onOpenCompany(c._id);
                                                }}
                                            >
                                                Manage
                                            </Button>
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

// ─── Row Actions ──────────────────────────────────────────────────────────────

function RowActions({
    busy,
    compact,
    email,
    canApprove,
    canReject,
    canDeactivate,
    canReactivate,
    canDelete,
    canCopyEmail,
    onApprove,
    onReject,
    onDeactivate,
    onReactivate,
    onDelete,
}: {
    busy: boolean;
    compact?: boolean;
    email?: string;
    canApprove?: boolean;
    canReject?: boolean;
    canDeactivate?: boolean;
    canReactivate?: boolean;
    canDelete?: boolean;
    canCopyEmail?: boolean;
    onApprove?: () => void;
    onReject?: () => void;
    onDeactivate?: () => void;
    onReactivate?: () => void;
    onDelete?: () => void;
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
            {canDelete && (
                <Button
                    size={btnSize}
                    color="secondary"
                    iconLeading={Trash01}
                    isDisabled={busy}
                    onClick={onDelete}
                >
                    Delete
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
    const deleteAccount = useMutation(api.superAdmin.deleteAccount);
    const requestConfirm = useRequestConfirm();
    const [busyId, setBusyId] = useState<string | null>(null);

    type Op = "approve" | "reject" | "deactivate" | "reactivate";

    const runAction = async (id: Id<"users">, name: string, op: Op) => {
        setBusyId(id);
        try {
            const fn = { approve, reject, deactivate, reactivate }[op];
            await fn({ id });
            const pastTense: Record<Op, string> = {
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

    /**
     * Open the shared confirm modal for a destructive / privileged op,
     * then dispatch to runAction. Approve / reactivate use brand tone;
     * reject / deactivate use destructive tone.
     */
    const requestAction = (id: Id<"users">, name: string, op: Op) => {
        const config: Record<Op, { title: string; description: string; tone: "primary" | "destructive"; confirmLabel: string }> = {
            approve: {
                title: `Approve ${name}?`,
                description: "They will gain access to the platform and receive a welcome email.",
                tone: "primary",
                confirmLabel: "Approve account",
            },
            reject: {
                title: `Reject ${name}?`,
                description: "They will receive a rejection email and be unable to sign in.",
                tone: "destructive",
                confirmLabel: "Reject account",
            },
            deactivate: {
                title: `Deactivate ${name}?`,
                description: "They will lose access immediately. You can reactivate them later.",
                tone: "destructive",
                confirmLabel: "Deactivate account",
            },
            reactivate: {
                title: `Reactivate ${name}?`,
                description: "They will regain platform access and a welcome-back email is sent.",
                tone: "primary",
                confirmLabel: "Reactivate account",
            },
        };
        const cfg = config[op];
        requestConfirm({
            ...cfg,
            onConfirm: () => runAction(id, name, op),
        });
    };

    const requestDelete = (id: Id<"users">, name: string) => {
        requestConfirm({
            title: `Permanently delete ${name}?`,
            description:
                "This removes the account record from CyberHook. The Clerk identity is unaffected. This action cannot be undone.",
            confirmLabel: "Delete account",
            tone: "destructive",
            onConfirm: async () => {
                setBusyId(id);
                try {
                    await deleteAccount({ id });
                    toast.success(`${name} deleted`);
                } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to delete");
                } finally {
                    setBusyId(null);
                }
            },
        });
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
                                                    canDelete={
                                                        u.status === "rejected" ||
                                                        u.status === "deactivated"
                                                    }
                                                    canCopyEmail
                                                    onApprove={() => requestAction(u._id, name, "approve")}
                                                    onReject={() => requestAction(u._id, name, "reject")}
                                                    onDeactivate={() => requestAction(u._id, name, "deactivate")}
                                                    onReactivate={() => requestAction(u._id, name, "reactivate")}
                                                    onDelete={() => requestDelete(u._id, name)}
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
