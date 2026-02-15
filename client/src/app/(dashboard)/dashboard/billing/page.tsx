'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Check,
  Zap,
  Building2,
  Crown,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { billingApi } from '@/services/api';
import toast from 'react-hot-toast';

const PLANS = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: 'Free',
    period: '',
    icon: Zap,
    color: 'text-green-500',
    features: [
      '1 target',
      '10 scans/month',
      'Basic vulnerability scanning',
      'Email notifications',
      'Community support',
    ],
  },
  {
    key: 'PROFESSIONAL',
    name: 'Professional',
    price: '$49',
    period: '/month',
    icon: CreditCard,
    color: 'text-blue-500',
    popular: true,
    features: [
      '10 targets',
      '100 scans/month',
      'All scanner modules',
      'Scheduled scans',
      'PDF/SARIF reports',
      'Team collaboration (5 members)',
      'API access',
      'Slack & Webhook integrations',
      'Priority support',
    ],
  },
  {
    key: 'BUSINESS',
    name: 'Business',
    price: '$149',
    period: '/month',
    icon: Building2,
    color: 'text-purple-500',
    features: [
      '50 targets',
      '500 scans/month',
      'Everything in Professional',
      'Custom report branding',
      'Jira integration',
      'Alert rules & thresholds',
      'Data retention policies',
      'Team collaboration (25 members)',
      'Dedicated support',
    ],
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    price: '$499',
    period: '/month',
    icon: Crown,
    color: 'text-amber-500',
    features: [
      'Unlimited targets',
      'Unlimited scans',
      'Everything in Business',
      'Custom scanner modules',
      'On-premise deployment',
      'SSO/SAML',
      'SLA guarantee',
      'Dedicated account manager',
    ],
  },
];

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: async () => {
      const res = await billingApi.getSubscription();
      return (res.data as any)?.data;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (plan: string) => billingApi.createCheckout(plan),
    onSuccess: (res) => {
      const url = (res.data as any)?.data?.url;
      if (url) {
        window.location.href = url;
      }
    },
    onError: () => {
      toast.error('Failed to start checkout. Please try again.');
      setUpgrading(null);
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => billingApi.createPortal(),
    onSuccess: (res) => {
      const portalUrl = (res.data as any)?.data?.customerPortalUrl;
      if (portalUrl) {
        window.location.href = portalUrl;
      }
    },
    onError: () => toast.error('Failed to open billing portal'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => billingApi.cancel(),
    onSuccess: () => {
      toast.success('Subscription will be cancelled at the end of billing period');
      queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
    },
    onError: () => toast.error('Failed to cancel subscription'),
  });

  const currentPlan = subscription?.plan || 'STARTER';
  const scansUsed = subscription?.scansUsed || 0;
  const maxScans = subscription?.maxScansPerMonth || 10;
  const scanPct = Math.min(100, Math.round((scansUsed / maxScans) * 100));

  const handleUpgrade = (planKey: string) => {
    if (planKey === currentPlan) return;
    if (planKey === 'STARTER') return;
    setUpgrading(planKey);
    checkoutMutation.mutate(planKey);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your plan, view usage, and update payment information.
        </p>
      </div>

      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{currentPlan}</span>
                {subscription?.subscription?.cancelAtPeriodEnd && (
                  <Badge variant="destructive">Cancelling</Badge>
                )}
              </div>
              {subscription?.subscription && (
                <p className="text-sm text-muted-foreground mt-1">
                  Next billing: {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {subscription?.polarCustomerId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-1" />
                  )}
                  Manage Billing
                </Button>
              )}
              {subscription?.polarSubId && !subscription?.subscription?.cancelAtPeriodEnd && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel your subscription?')) {
                      cancelMutation.mutate();
                    }
                  }}
                  disabled={cancelMutation.isPending}
                >
                  Cancel Plan
                </Button>
              )}
            </div>
          </div>

          {/* Usage */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Scans used this month</span>
              <span className="font-medium">{scansUsed} / {maxScans}</span>
            </div>
            <Progress value={scanPct} className="h-2" />
            {scanPct >= 80 && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {scanPct >= 100 ? 'Scan limit reached. Upgrade to continue scanning.' : 'Approaching scan limit.'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Targets</span>
              <p className="font-medium">{subscription?.maxTargets || 1} allowed</p>
            </div>
            <div>
              <span className="text-muted-foreground">Scans / month</span>
              <p className="font-medium">{maxScans}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Choose a Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            const PlanIcon = plan.icon;

            return (
              <Card
                key={plan.key}
                className={`relative ${isCurrent ? 'border-primary ring-1 ring-primary' : ''} ${plan.popular ? 'border-blue-300 dark:border-blue-700' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <PlanIcon className={`h-8 w-8 mx-auto mb-2 ${plan.color}`} />
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'secondary'}
                    disabled={isCurrent || upgrading === plan.key || plan.key === 'STARTER'}
                    onClick={() => handleUpgrade(plan.key)}
                  >
                    {upgrading === plan.key ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    {isCurrent ? 'Current Plan' : plan.key === 'STARTER' ? 'Free' : 'Upgrade'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
