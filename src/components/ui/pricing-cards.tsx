"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { CheckCheck, Loader2, Search, Users, Headphones, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

const planTierOrder: Record<string, number> = {
  solo: 0,
  starter: 0,
  growth: 1,
  pro: 1,
  scale: 2,
  enterprise: 2,
};

const plans = [
  {
    name: "Solo",
    description: "For individual reps exploring cybersecurity sales intelligence",
    price: 99,
    yearlyPrice: 950,
    planId: "solo",
    stripePriceId: "price_1TILtWBs6XEduMNFnbOxNXbH",
    stripeYearlyPriceId: "price_1TILtWBs6XEduMNFmuGWVEav",
    features: [
      { text: "50 Live Searches/mo", icon: <Search size={18} /> },
      { text: "1 User", icon: <Users size={18} /> },
      { text: "Email Support", icon: <Headphones size={18} /> },
    ],
    includes: [
      "Solo includes:",
      "Live Search & Exposure Reports",
      "Live Leads Discovery",
      "10 Watchlist Domains",
      "Basic Reporting",
    ],
  },
  {
    name: "Growth",
    description: "For growing teams that need AI outreach and integrations",
    price: 299,
    yearlyPrice: 2870,
    planId: "growth",
    stripePriceId: "price_1TILtWBs6XEduMNFGSeE9yjS",
    stripeYearlyPriceId: "price_1TILtWBs6XEduMNFRE8Rc9SV",
    popular: true,
    features: [
      { text: "200 Live Searches/mo", icon: <Search size={18} /> },
      { text: "5 Users", icon: <Users size={18} /> },
      { text: "Priority Support", icon: <Headphones size={18} /> },
    ],
    includes: [
      "Everything in Solo, plus:",
      "AI Email Campaigns",
      "CRM Integrations",
      "50 Watchlist Domains",
      "Advanced Reporting",
    ],
  },
  {
    name: "Scale",
    description: "Unlimited access with white-label and dedicated support",
    price: 499,
    yearlyPrice: 4790,
    planId: "scale",
    stripePriceId: "price_1TILtXBs6XEduMNFxtWYdxHH",
    stripeYearlyPriceId: "price_1TILtXBs6XEduMNFY0oTCnSN",
    features: [
      { text: "Unlimited Searches", icon: <Search size={18} /> },
      { text: "Unlimited Users", icon: <Shield size={18} /> },
      { text: "Dedicated Support", icon: <Headphones size={18} /> },
    ],
    includes: [
      "Everything in Growth, plus:",
      "White-Label Reports",
      "Unlimited Watchlist Domains",
      "Unlimited Reports",
      "Dedicated Success Manager",
    ],
  },
];

const PricingSwitch = ({
  onSwitch,
  className,
}: {
  onSwitch: (value: string) => void;
  className?: string;
}) => {
  const [selected, setSelected] = useState("0");

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className={cn("flex justify-center", className)}>
      <div className="relative z-10 mx-auto flex w-fit rounded-full bg-secondary_subtle border border-secondary p-1">
        <button
          onClick={() => handleSwitch("0")}
          className={cn(
            "relative z-10 w-fit h-10 cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-colors",
            selected === "0"
              ? "text-primary"
              : "text-tertiary hover:text-primary",
          )}
        >
          {selected === "0" && (
            <motion.span
              layoutId="pricing-switch"
              className="absolute top-0 left-0 h-10 w-full rounded-full border border-secondary bg-primary shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">Monthly</span>
        </button>

        <button
          onClick={() => handleSwitch("1")}
          className={cn(
            "relative z-10 w-fit cursor-pointer h-10 flex-shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors",
            selected === "1"
              ? "text-primary"
              : "text-tertiary hover:text-primary",
          )}
        >
          {selected === "1" && (
            <motion.span
              layoutId="pricing-switch"
              className="absolute top-0 left-0 h-10 w-full rounded-full border border-secondary bg-primary shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            Yearly
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              Save 20%
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

interface PricingCardsProps {
  currentPlanId: string;
  onManagePlan?: () => void;
}

export default function PricingCards({ currentPlanId, onManagePlan }: PricingCardsProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const createCheckout = useAction(api.stripe.createCheckoutSession);

  const togglePricingPeriod = (value: string) =>
    setIsYearly(Number.parseInt(value) === 1);

  const currentTier = planTierOrder[currentPlanId] ?? 0;

  const isCurrent = (planId: string) => {
    if (planId === "growth" && (currentPlanId === "pro" || currentPlanId === "growth")) return true;
    return currentPlanId === planId;
  };

  const isLowerTier = (planId: string) => {
    const tier = planTierOrder[planId] ?? 0;
    return tier < currentTier;
  };

  const handleSelectPlan = async (plan: typeof plans[number]) => {
    if (isCurrent(plan.planId)) return;
    setLoadingPlan(plan.planId);

    try {
      const priceId = isYearly ? plan.stripeYearlyPriceId : plan.stripePriceId;
      const result = await createCheckout({
        priceId,
        planId: plan.planId,
        successUrl: `${window.location.origin}/settings?tab=plan&success=true`,
        cancelUrl: `${window.location.origin}/settings?tab=plan`,
      });

      if (result.url && result.url.startsWith("https://checkout.stripe.com")) {
        window.location.href = result.url;
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Checkout error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to start checkout"
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="w-full">
      <div className="flex sm:flex-row flex-col sm:items-center items-start justify-between mb-6">
        <div />
        <PricingSwitch onSwitch={togglePricingPeriod} className="shrink-0" />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "relative flex flex-col justify-between rounded-2xl",
              plan.popular
                ? "border-2 border-brand bg-secondary_subtle shadow-lg"
                : "border-2 border-secondary bg-primary hover:border-brand-secondary transition-colors"
            )}
          >
            {/* Position badges absolutely so they don't push the price row down
                on popular / current cards. This keeps $99, $299, $499 aligned
                across the three columns. */}
            {(plan.popular || isCurrent(plan.planId)) && (
              <div className="absolute top-3 right-3 flex flex-wrap justify-end gap-1.5">
                {plan.popular && (
                  <span className="bg-brand-600 text-white px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                    Most Popular
                  </span>
                )}
                {isCurrent(plan.planId) && (
                  <span className="bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full text-xs font-medium border border-brand-200 whitespace-nowrap">
                    Current Plan
                  </span>
                )}
              </div>
            )}
            <CardContent className="pt-12">
              <div className="space-y-2 pb-3">
                <div className="flex items-baseline">
                  <span className="text-4xl font-semibold text-primary">
                    $
                    <NumberFlow
                      format={{ currency: "USD" }}
                      value={isYearly ? plan.yearlyPrice : plan.price}
                      className="text-4xl font-semibold"
                    />
                  </span>
                  <span className="text-tertiary ml-1">
                    /{isYearly ? "year" : "month"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between">
                <h3 className="text-2xl font-semibold text-primary mb-1">{plan.name}</h3>
              </div>
              <p className="text-sm text-tertiary mb-4">
                {plan.description}
              </p>

              <div className="space-y-3 pt-4 border-t border-secondary">
                <h4 className="font-medium text-sm text-primary mb-3">
                  {plan.includes[0]}
                </h4>
                <ul className="space-y-2.5">
                  {plan.includes.slice(1).map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <span className="h-5 w-5 rounded-full grid place-content-center mr-3 shrink-0 text-brand-secondary bg-brand-50 border border-brand-200">
                        <CheckCheck className="h-3 w-3" />
                      </span>
                      <span className="text-sm text-secondary">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="pb-6">
              {isCurrent(plan.planId) ? (
                <button
                  onClick={onManagePlan}
                  className="w-full p-2.5 text-sm font-semibold rounded-xl border border-secondary text-secondary hover:bg-secondary_subtle transition-colors flex items-center justify-center"
                >
                  Update Plan
                </button>
              ) : (
                <button
                  disabled={loadingPlan === plan.planId}
                  onClick={() => handleSelectPlan(plan)}
                  className={cn(
                    "w-full p-2.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2",
                    plan.popular
                      ? "bg-brand-600 text-white border border-brand-700 shadow-sm hover:bg-brand-700"
                      : "bg-primary text-primary border-2 border-secondary hover:border-brand-secondary hover:bg-secondary_subtle"
                  )}
                >
                  {loadingPlan === plan.planId && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {loadingPlan === plan.planId
                    ? "Redirecting..."
                    : isLowerTier(plan.planId)
                      ? "Downgrade"
                      : "Upgrade"}
                </button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
