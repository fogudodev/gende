import { useMemo } from "react";
import { useSubscription } from "./useSubscription";
import { PLAN_FEATURES, PRODUCT_TO_PLAN, type FeatureKey, type PlanId } from "@/lib/stripe-plans";

export const useFeatureAccess = () => {
  const { data: subscription, isLoading } = useSubscription();

  const currentPlan: PlanId | "none" = useMemo(() => {
    if (!subscription) return "none";
    const planId = subscription.plan_id;
    // Map old plan IDs
    if (!planId || planId === "free" || planId === "none") return "none";
    if (planId === "starter" || planId === "essencial") return "essencial";
    if (planId === "pro" || planId === "enterprise") return "enterprise";
    // Check by product mapping if stored differently
    if (planId && PRODUCT_TO_PLAN[planId]) return PRODUCT_TO_PLAN[planId];
    return "none";
  }, [subscription]);

  const hasFeature = useMemo(() => {
    const allowedFeatures = PLAN_FEATURES[currentPlan] || PLAN_FEATURES.none;
    return (feature: FeatureKey) => allowedFeatures.includes(feature);
  }, [currentPlan]);

  const isLocked = useMemo(() => {
    return (feature: FeatureKey) => !hasFeature(feature);
  }, [hasFeature]);

  // Which plan is needed for a locked feature
  const requiredPlan = (feature: FeatureKey): PlanId | null => {
    if (PLAN_FEATURES.essencial.includes(feature)) return "essencial";
    if (PLAN_FEATURES.enterprise.includes(feature)) return "enterprise";
    return null;
  };

  return {
    currentPlan,
    hasFeature,
    isLocked,
    requiredPlan,
    isLoading,
    subscription,
  };
};
