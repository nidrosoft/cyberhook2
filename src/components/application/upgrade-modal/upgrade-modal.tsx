"use client";

import { useState, createContext, useContext, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Lock01, Zap, CheckCircle, XClose, ArrowRight } from "@untitledui/icons";
import { ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { PLANS, getPlan, getUpgradeTarget, PLAN_ORDER, formatLimit, type PlanTier } from "@/lib/plans";

// ─── Types ───────────────────────────────────────────────────────────────────

type UpgradeReason =
  | { type: "feature"; feature: string; description: string }
  | { type: "usage"; resource: string; message: string }
  | { type: "general"; message?: string };

interface UpgradeModalContextType {
  showUpgradeModal: (currentPlan: PlanTier, reason: UpgradeReason) => void;
  closeUpgradeModal: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const UpgradeModalContext = createContext<UpgradeModalContextType | null>(null);

export function useUpgradeModal() {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx) throw new Error("useUpgradeModal must be used within UpgradeModalProvider");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanTier>("solo");
  const [reason, setReason] = useState<UpgradeReason>({ type: "general" });

  const showUpgradeModal = useCallback((plan: PlanTier, r: UpgradeReason) => {
    setCurrentPlan(plan);
    setReason(r);
    setIsOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => setIsOpen(false), []);

  return (
    <UpgradeModalContext.Provider value={{ showUpgradeModal, closeUpgradeModal }}>
      {children}
      {isOpen && (
        <UpgradeModalContent
          currentPlan={currentPlan}
          reason={reason}
          onClose={closeUpgradeModal}
        />
      )}
    </UpgradeModalContext.Provider>
  );
}

// ─── Modal Content ───────────────────────────────────────────────────────────

function UpgradeModalContent({
  currentPlan,
  reason,
  onClose,
}: {
  currentPlan: PlanTier;
  reason: UpgradeReason;
  onClose: () => void;
}) {
  const router = useRouter();
  const targetPlanId = getUpgradeTarget(currentPlan);
  const targetPlan = targetPlanId ? getPlan(targetPlanId) : null;
  const current = getPlan(currentPlan);

  const heading =
    reason.type === "feature"
      ? `Unlock ${reason.feature}`
      : reason.type === "usage"
        ? "Limit Reached"
        : "Upgrade Your Plan";

  const description =
    reason.type === "feature"
      ? reason.description
      : reason.type === "usage"
        ? reason.message
        : "Get access to more features and higher limits.";

  return (
    <ModalOverlay isOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal>
        <Dialog>
          <div className="w-full max-w-lg rounded-2xl bg-primary shadow-xl border border-secondary">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary_alt">
                  {reason.type === "feature" ? (
                    <Lock01 className="h-5 w-5 text-brand-secondary" />
                  ) : (
                    <Zap className="h-5 w-5 text-brand-secondary" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-primary">{heading}</h2>
                  <p className="text-sm text-tertiary">{description}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-quaternary hover:text-secondary hover:bg-secondary_subtle transition">
                <XClose className="h-5 w-5" />
              </button>
            </div>

            {/* Plan Comparison */}
            {targetPlan && (
              <div className="px-6 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Current Plan */}
                  <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-secondary_subtle p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-secondary">{current.name}</span>
                      <Badge color="gray" size="sm">Current</Badge>
                    </div>
                    <span className="text-xl font-bold text-primary">{current.priceLabel}<span className="text-sm font-normal text-tertiary">/mo</span></span>
                    <ul className="flex flex-col gap-1.5">
                      <li className="text-xs text-tertiary">{formatLimit(current.searchesPerMonth)} searches/mo</li>
                      <li className="text-xs text-tertiary">{formatLimit(current.reportsPerMonth)} reports/mo</li>
                      <li className="text-xs text-tertiary">{current.watchlistDomains} watchlist domains</li>
                      <li className="text-xs text-tertiary">{current.maxUsers} user{current.maxUsers > 1 ? "s" : ""}</li>
                      <li className="text-xs text-tertiary">{current.aiAgents ? "AI Agents" : "No AI Agents"}</li>
                      <li className="text-xs text-tertiary">{current.integrations ? "Integrations" : "No integrations"}</li>
                    </ul>
                  </div>

                  {/* Target Plan */}
                  <div className="flex flex-col gap-3 rounded-xl border-2 border-brand-secondary bg-primary p-4 ring-1 ring-brand-secondary/20">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-primary">{targetPlan.name}</span>
                      {targetPlan.badge && <Badge color="brand" size="sm">{targetPlan.badge}</Badge>}
                    </div>
                    <span className="text-xl font-bold text-primary">{targetPlan.priceLabel}<span className="text-sm font-normal text-tertiary">/mo</span></span>
                    <ul className="flex flex-col gap-1.5">
                      <li className="flex items-center gap-1 text-xs text-primary">
                        <CheckCircle className="h-3 w-3 text-success-500 shrink-0" />
                        {formatLimit(targetPlan.searchesPerMonth)} searches/mo
                      </li>
                      <li className="flex items-center gap-1 text-xs text-primary">
                        <CheckCircle className="h-3 w-3 text-success-500 shrink-0" />
                        {formatLimit(targetPlan.reportsPerMonth)} reports/mo
                      </li>
                      <li className="flex items-center gap-1 text-xs text-primary">
                        <CheckCircle className="h-3 w-3 text-success-500 shrink-0" />
                        {targetPlan.watchlistDomains} watchlist domains
                      </li>
                      <li className="flex items-center gap-1 text-xs text-primary">
                        <CheckCircle className="h-3 w-3 text-success-500 shrink-0" />
                        {targetPlan.maxUsers} users
                      </li>
                      {targetPlan.aiAgents && (
                        <li className="flex items-center gap-1 text-xs text-primary">
                          <CheckCircle className="h-3 w-3 text-success-500 shrink-0" />
                          AI Agents included
                        </li>
                      )}
                      {targetPlan.integrations && (
                        <li className="flex items-center gap-1 text-xs text-primary">
                          <CheckCircle className="h-3 w-3 text-success-500 shrink-0" />
                          Third-party integrations
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-secondary px-6 py-4">
              <Button color="secondary" size="md" onClick={onClose}>
                Maybe Later
              </Button>
              <Button
                color="primary"
                size="md"
                iconTrailing={ArrowRight}
                onClick={() => {
                  onClose();
                  router.push("/billing");
                }}
              >
                Upgrade to {targetPlan?.name ?? "a higher plan"}
              </Button>
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

// ─── Inline Gate Badge (for showing lock on gated features) ──────────────────

export function PlanGateBadge({ label = "Upgrade" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning-secondary px-2 py-0.5 text-xs font-medium text-warning-primary">
      <Lock01 className="h-3 w-3" />
      {label}
    </span>
  );
}
