import { PricingTierCardCallout } from "@/components/marketing/pricing-sections/base-components/pricing-tier-card";

const plans = [
    {
        title: "Basic plan",
        subtitle: "$10/mth",
        description: "Billed annually.",
        secondAction: "Chat to sales",
        callOut: "Most popular",
        features: [
            "Access to all basic features",
            "Basic reporting and analytics",
            "Up to 10 individual users",
            "20 GB individual data",
            "Basic chat and email support",
        ],
        hasCallout: true,
    },
    {
        title: "Business plan",
        subtitle: "$20/mth",
        description: "Billed annually.",
        secondAction: "Chat to sales",
        features: [
            "200+ integrations",
            "Advanced reporting and analytics",
            "Up to 20 individual users",
            "40 GB individual data",
            "Priority chat and email support",
        ],
    },
    {
        title: "Enterprise plan",
        subtitle: "$40/mth",
        description: "Billed annually.",
        secondAction: "Chat to sales",
        features: [
            "Advanced custom fields",
            "Audit log and data history",
            "Unlimited individual users",
            "Unlimited individual data",
            "Personalized + priority service",
        ],
    },
];

export const PricingSimpleCallOut = () => {
    return (
        <section className="bg-primary py-16 md:py-24">
            <div className="mx-auto max-w-container px-4 md:px-8">
                <div className="flex w-full max-w-3xl flex-col">
                    <p className="text-sm font-semibold text-brand-secondary md:text-md">Pricing</p>
                    <h2 className="mt-3 text-display-md font-semibold text-primary md:text-display-lg">Simple, transparent pricing</h2>
                    <p className="mt-4 text-lg text-tertiary md:mt-6 md:text-xl">
                        We believe Untitled should be accessible to all companies, no matter the size.
                    </p>
                </div>

                <div className="mt-16 grid w-full grid-cols-1 gap-4 md:mt-24 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
                    {plans.map((plan) => (
                        <PricingTierCardCallout key={plan.title} {...plan} checkItemTextColor="success" />
                    ))}
                </div>
            </div>
        </section>
    );
};
