'use client';

import React, { useState, useEffect } from 'react';

interface ManageTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBalanceUpdate?: (newBalance: number) => void;
  initialTab?: 'buy' | 'history';
}

interface TransactionItem {
  transaction_id: number;
  organization_id: number;
  user_id: number | null;
  user_name: string | null;
  amount: number;
  transaction_type: string;
  payment_reference: string | null;
  balance_after: number;
  description: string | null;
  payment_method: string | null;
  created_at: string;
}

interface PricingConfig {
  price_per_token: number;
  tender_publish_cost: number;
  bid_cost: number;
}

interface TokenPackage {
  package_id: number;
  package_name: string;
  token_amount: number;
  price_bdt: number;
  badge: string | null;
  is_active: boolean;
  original_price_bdt: number;
  savings_percentage: number;
  savings_bdt: number;
}

export default function ManageTokensModal({
  isOpen,
  onClose,
  onBalanceUpdate,
  initialTab = 'buy',
}: ManageTokensModalProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'history'>(initialTab);
  const [balance, setBalance] = useState<number>(0);
  const [orgName, setOrgName] = useState<string>('Organization');
  const [pricing, setPricing] = useState<PricingConfig>({
    price_per_token: 1.0,
    tender_publish_cost: 50,
    bid_cost: 20,
  });

  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number>(250);
  const [customTokens, setCustomTokens] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);

  // Payment checkout state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'mfs' | 'bank'>('mfs');
  const [selectedProvider, setSelectedProvider] = useState<string>('bKash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{
    tokens: number;
    amount: number;
    reference: string;
    newBalance: number;
  } | null>(null);

  // History state
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'purchase' | 'deduct'>('all');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchBalance();
      fetchPricing();
      fetchPackages();
      fetchTransactions();
      setPurchaseSuccess(null);
      setIsCheckoutOpen(false);
    }
  }, [isOpen, initialTab]);

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/balance');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.credit_balance);
        if (data.organization_name) setOrgName(data.organization_name);
        if (onBalanceUpdate) onBalanceUpdate(data.credit_balance);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPricing = async () => {
    try {
      const res = await fetch('/api/payments/pricing');
      if (res.ok) {
        const data = await res.json();
        setPricing({
          price_per_token: Number(data.price_per_token) || 1.0,
          tender_publish_cost: Number(data.tender_publish_cost) || 50,
          bid_cost: Number(data.bid_cost) || 20,
        });
      }
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
    }
  };

  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const res = await fetch('/api/payments/packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
        if (data.length > 0) {
          const popular = data.find((p: TokenPackage) => p.badge?.toLowerCase().includes('popular')) || data[1] || data[0];
          setSelectedPackage(popular.token_amount);
        }
      }
    } catch (err) {
      console.error('Failed to fetch packages:', err);
    } finally {
      setLoadingPackages(false);
    }
  };

  const fetchTransactions = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/payments/transactions?limit=100');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const currentTokensToBuy = isCustom
    ? parseInt(customTokens, 10) || 0
    : selectedPackage;

  const matchingPackage = !isCustom ? packages.find(p => p.token_amount === currentTokensToBuy) : null;
  const totalCostBDT = matchingPackage ? matchingPackage.price_bdt : currentTokensToBuy * pricing.price_per_token;
  const originalCostBDT = currentTokensToBuy * pricing.price_per_token;
  const savingsBDT = Math.max(0, originalCostBDT - totalCostBDT);
  const savingsPct = originalCostBDT > 0 ? Math.round((savingsBDT / originalCostBDT) * 100) : 0;

  const handleStartCheckout = () => {
    if (currentTokensToBuy <= 0) {
      alert('Please enter or select a valid token quantity.');
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleCompletePurchase = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/payments/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: currentTokensToBuy,
          payment_method: 'SSLCommerz',
          card_type: `${selectedMethod.toUpperCase()} - ${selectedProvider}`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Payment processing failed.');
      }

      const data = await res.json();
      setBalance(data.new_balance);
      if (onBalanceUpdate) onBalanceUpdate(data.new_balance);

      setPurchaseSuccess({
        tokens: data.tokens_added,
        amount: data.amount_paid_bdt,
        reference: data.payment_reference,
        newBalance: data.new_balance,
      });
      setIsCheckoutOpen(false);
      fetchTransactions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const filteredTransactions = transactions.filter((tx) => {
    if (historyFilter === 'purchase') return tx.transaction_type.toLowerCase() === 'purchase';
    if (historyFilter === 'deduct') return tx.transaction_type.toLowerCase() === 'deduct';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-surface rounded shadow-xl border border-subtle overflow-hidden flex flex-col max-h-[90vh] z-10">
        {/* Modal Header */}
        <div className="bg-surface px-6 md:px-8 py-4 flex items-center justify-between border-b border-subtle flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-brand-navy flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-content-primary">Organization Token Wallet</h2>
                <span className="badge-status badge-draft">
                  <span className="badge-dot" />Shared Balance
                </span>
              </div>
              <p className="text-content-secondary text-xs font-medium mt-0.5">{orgName} — Shared across all team members</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded bg-transparent hover:bg-slate-100 text-content-secondary hover:text-content-primary flex items-center justify-center transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 md:px-8 pt-3 pb-2 bg-app border-b border-subtle flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab('buy');
                setPurchaseSuccess(null);
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'buy'
                  ? 'bg-brand-navy text-white'
                  : 'text-content-secondary hover:bg-slate-100 hover:text-content-primary'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Buy Tokens (SSLCommerz)
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                fetchTransactions();
              }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-brand-navy text-white'
                  : 'text-content-secondary hover:bg-slate-100 hover:text-content-primary'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Transaction History
            </button>
          </div>

          {/* Quick Balance indicator */}
          <div className="flex items-center gap-2 bg-surface border border-subtle px-3 py-1.5 rounded">
            <span className="text-content-secondary text-xs font-medium">Current Balance:</span>
            <span className="text-sm font-semibold text-content-primary tabular-nums">
              {loading ? '...' : balance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {activeTab === 'buy' ? (
            <>
              {purchaseSuccess ? (
                /* Success celebration screen */
                <div className="bg-status-approved-bg border border-subtle rounded p-6 text-center space-y-5">
                  <div className="w-12 h-12 bg-status-approved-text text-white rounded flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-content-primary">Token Purchase Successful!</h3>
                    <p className="text-content-secondary text-xs font-medium mt-1">
                      Your organization token balance has been updated immediately.
                    </p>
                  </div>

                  <div className="max-w-md mx-auto bg-surface rounded p-5 border border-subtle grid grid-cols-2 gap-4 text-left">
                    <div>
                      <p className="text-content-secondary text-xs font-medium uppercase">Tokens Added</p>
                      <p className="text-lg font-semibold text-status-approved-text tabular-nums mt-0.5">+{purchaseSuccess.tokens} Tokens</p>
                    </div>
                    <div>
                      <p className="text-content-secondary text-xs font-medium uppercase">New Balance</p>
                      <p className="text-lg font-semibold text-content-primary tabular-nums mt-0.5">{purchaseSuccess.newBalance} Tokens</p>
                    </div>
                    <div>
                      <p className="text-content-secondary text-xs font-medium uppercase">Amount Paid</p>
                      <p className="text-sm font-medium text-content-primary tabular-nums mt-0.5">৳ {purchaseSuccess.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-content-secondary text-xs font-medium uppercase">Reference ID</p>
                      <p className="text-xs font-mono font-medium text-content-secondary mt-0.5">{purchaseSuccess.reference}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setPurchaseSuccess(null)}
                      className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition"
                    >
                      Buy More Tokens
                    </button>
                    <button
                      onClick={onClose}
                      className="px-3.5 h-9 bg-app text-content-secondary font-medium rounded border border-subtle hover:bg-slate-100 transition text-sm"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Balance Hero Card - High Contrast, Crystal Clear */}
                  <div className="bg-surface border border-subtle rounded p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-content-secondary text-xs font-medium uppercase tracking-wider">
                          Total Shared Balance
                        </span>
                        <span className="badge-status badge-approved">
                          <span className="badge-dot" />Live
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-3xl md:text-4xl font-semibold text-content-primary tabular-nums tracking-tight">
                          {loading ? '...' : balance.toLocaleString()}
                        </span>
                        <span className="text-lg font-medium text-content-secondary">
                          Tokens
                        </span>
                      </div>
                      <p className="text-content-secondary text-xs font-medium pt-1 flex items-center gap-1.5">
                        Equivalent Value: <span className="font-semibold text-content-primary text-sm tabular-nums">৳ {(balance * pricing.price_per_token).toLocaleString()} BDT</span>
                      </p>
                    </div>

                    {/* Platform Rates Info Box */}
                    <div className="bg-app border border-subtle rounded p-4 md:p-5 min-w-[270px] space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-subtle">
                        <span className="text-content-primary font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-content-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Platform Rates
                        </span>
                        <span className="text-[10px] text-content-muted font-medium">Standard</span>
                      </div>
                      <div className="flex flex-col gap-2 text-xs">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-content-secondary font-medium">1 Token Cost:</span>
                          <span className="font-semibold text-content-primary tabular-nums bg-surface px-2 py-0.5 rounded border border-subtle">
                            ৳ {pricing.price_per_token.toFixed(2)} BDT
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-content-secondary font-medium">Publish Tender:</span>
                          <span className="font-semibold text-content-primary tabular-nums bg-surface px-2 py-0.5 rounded border border-subtle">
                            {pricing.tender_publish_cost} Tokens
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-content-secondary font-medium">Submit Bid:</span>
                          <span className="font-semibold text-content-primary tabular-nums bg-surface px-2 py-0.5 rounded border border-subtle">
                            {pricing.bid_cost} Tokens
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Choose Packages */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-content-primary">Select Token Package</h3>
                        <p className="text-content-secondary text-xs font-medium">Choose a discounted bundle or enter a custom amount</p>
                      </div>
                      <span className="badge-status badge-approved">
                        ⚡ Instant Credit
                      </span>
                    </div>

                    {loadingPackages ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-pulse">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-32 bg-app rounded border border-subtle" />
                        ))}
                      </div>
                    ) : packages.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No packages available at the moment.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {packages.map((pkg) => {
                          const isSelected = !isCustom && selectedPackage === pkg.token_amount;
                          return (
                            <div
                              key={pkg.package_id}
                              onClick={() => {
                                setIsCustom(false);
                                setSelectedPackage(pkg.token_amount);
                              }}
                              className={`relative cursor-pointer rounded p-4 border transition-all duration-200 flex flex-col justify-between group ${
                                isSelected
                                  ? 'border-brand-navy bg-app'
                                  : 'border-subtle bg-surface hover:border-content-muted'
                              }`}
                            >
                              {/* Custom Badge or Savings badge */}
                              {pkg.badge ? (
                                <span className="absolute -top-2.5 right-3 badge-status badge-approved">
                                  <span className="badge-dot" />{pkg.badge}
                                </span>
                              ) : pkg.savings_percentage > 0 ? (
                                <span className="absolute -top-2.5 right-3 badge-status badge-approved">
                                  <span className="badge-dot" />Save {pkg.savings_percentage}%
                                </span>
                              ) : null}

                              <div>
                                <div className="flex items-center justify-between">
                                  <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">{pkg.package_name}</p>
                                </div>
                                <p className="text-xl font-semibold text-content-primary tabular-nums mt-1 flex items-center gap-1.5">
                                  {pkg.token_amount.toLocaleString()}
                                  <span className="text-xs font-medium text-content-muted">Tokens</span>
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-subtle flex items-end justify-between">
                                <div>
                                  {pkg.savings_percentage > 0 && (
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[11px] text-content-muted line-through tabular-nums">
                                        ৳{pkg.original_price_bdt.toLocaleString()}
                                      </span>
                                      <span className="badge-status badge-approved">
                                        Save {pkg.savings_percentage}%
                                      </span>
                                    </div>
                                  )}
                                  <div className="text-sm font-semibold text-content-primary tabular-nums">
                                    ৳ {pkg.price_bdt.toLocaleString()}
                                  </div>
                                </div>

                                <div className={`w-5 h-5 rounded flex items-center justify-center transition ${
                                  isSelected ? 'bg-brand-navy text-white' : 'bg-app text-content-muted border border-subtle group-hover:bg-slate-100'
                                }`}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Custom Quantity */}
                  <div className="bg-app border border-subtle rounded p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="custom-toggle"
                        checked={isCustom}
                        onChange={(e) => setIsCustom(e.target.checked)}
                        className="rounded border-subtle text-brand-navy focus:ring-brand-blue"
                      />
                      <label htmlFor="custom-toggle" className="text-sm font-medium text-content-primary cursor-pointer">
                        Enter Custom Token Amount
                      </label>
                    </div>

                    {isCustom && (
                      <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                        <div className="relative flex-1 w-full">
                          <input
                            type="number"
                            min="1"
                            placeholder="e.g. 750"
                            value={customTokens}
                            onChange={(e) => setCustomTokens(e.target.value)}
                            className="w-full pl-3 pr-16 py-2 rounded border border-subtle focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm font-medium text-content-primary bg-surface"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-content-muted">
                            Tokens
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-content-primary whitespace-nowrap">
                          <span className="text-content-secondary font-normal">Total:</span>
                          <span className="text-base text-content-primary font-semibold tabular-nums">৳ {totalCostBDT.toLocaleString()} BDT</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Purchase CTA Summary */}
                  <div className="bg-brand-navy border border-subtle rounded p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-400">You are purchasing:</p>
                      <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                        <span className="text-xl font-semibold text-white tabular-nums">{currentTokensToBuy.toLocaleString()} Tokens</span>
                        <span className="text-sm text-slate-300">
                          for <strong className="text-white text-sm tabular-nums">৳ {totalCostBDT.toLocaleString()} BDT</strong>
                        </span>
                        {savingsBDT > 0 && (
                          <span className="badge-status badge-approved">
                            <span className="badge-dot" />Saving ৳{savingsBDT.toLocaleString()} (-{savingsPct}%)
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleStartCheckout}
                      disabled={currentTokensToBuy <= 0}
                      className="w-full sm:w-auto bg-white text-brand-navy hover:bg-slate-100 text-sm font-medium h-9 px-4 rounded transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 text-brand-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Pay with SSLCommerz
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            /* Transaction History Tab */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-subtle">
                <div>
                  <h3 className="text-sm font-semibold text-content-primary">Organization Ledger</h3>
                  <p className="text-content-secondary text-xs font-medium">Full audit log of token credits, tender submissions, and bids.</p>
                </div>

                <div className="flex items-center gap-1 bg-app p-1 rounded border border-subtle">
                  {(['all', 'purchase', 'deduct'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setHistoryFilter(filter)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition capitalize ${
                        historyFilter === filter
                          ? 'bg-surface text-content-primary border border-subtle'
                          : 'text-content-secondary hover:text-content-primary'
                      }`}
                    >
                      {filter === 'all' ? 'All Transactions' : filter === 'purchase' ? 'Purchases' : 'Deductions'}
                    </button>
                  ))}
                </div>
              </div>

              {historyLoading ? (
                <div className="py-16 text-center text-content-muted">
                  <svg className="animate-spin h-8 w-8 text-content-muted mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading transaction history...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-16 text-center text-content-muted bg-app rounded border border-subtle">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  No transactions found for this filter.
                </div>
              ) : (
                <div className="overflow-x-auto rounded border border-subtle">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-app text-content-secondary text-xs font-medium uppercase tracking-wider border-b border-subtle">
                        <th className="px-4 py-3">Date & Time</th>
                        <th className="px-4 py-3">Action / Description</th>
                        <th className="px-4 py-3">Initiated By</th>
                        <th className="px-4 py-3">Tokens</th>
                        <th className="px-4 py-3">Balance After</th>
                        <th className="px-4 py-3">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {filteredTransactions.map((tx) => {
                        const isCredit = tx.amount > 0;
                        const dateFormatted = new Date(tx.created_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        return (
                          <tr key={tx.transaction_id} className="hover:bg-app transition">
                            <td className="px-4 py-3 text-xs text-content-secondary whitespace-nowrap">
                              {dateFormatted}
                            </td>
                            <td className="px-4 py-3 font-medium text-content-primary">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    isCredit ? 'bg-status-approved-text' : 'bg-status-rejected-text'
                                  }`}
                                />
                                <div>
                                  <p className="text-xs font-medium text-content-primary">{tx.description || tx.transaction_type}</p>
                                  {tx.payment_method && (
                                    <p className="text-[11px] text-content-muted">{tx.payment_method}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-content-secondary">
                              {tx.user_name || 'System / Platform'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`badge-status tabular-nums ${
                                  isCredit
                                    ? 'badge-approved'
                                    : 'badge-rejected'
                                }`}
                              >
                                {isCredit ? `+${Math.abs(tx.amount)}` : `-${Math.abs(tx.amount)}`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-content-primary tabular-nums whitespace-nowrap">
                              {tx.balance_after.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-content-muted whitespace-nowrap">
                              {tx.payment_reference || `#${tx.transaction_id}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 md:px-8 py-3 bg-app border-t border-subtle flex items-center justify-between text-xs text-content-secondary flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-status-approved-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>SSLCommerz 256-Bit Encrypted Payment Channel</span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-app hover:bg-slate-100 text-content-secondary font-medium rounded border border-subtle transition text-xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* SSLCommerz Simulated Payment Gateway Overlay Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface rounded shadow-xl border border-subtle w-full max-w-lg overflow-hidden">
            {/* Gateway Header */}
            <div className="bg-brand-navy text-white px-6 py-3 flex items-center justify-between border-b border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center font-semibold text-white text-xs">
                  SSL
                </div>
                <div>
                  <h4 className="font-medium text-sm">SSLCOMMERZ Payment Gateway</h4>
                  <p className="text-[11px] text-slate-300">ProcureNext Monetization Channel</p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-300 hover:text-white text-xs font-medium"
              >
                Cancel
              </button>
            </div>

            {/* Gateway Body */}
            <div className="p-6 space-y-5">
              {/* Amount Summary */}
              <div className="bg-app border border-subtle rounded p-4 flex items-center justify-between">
                <div>
                  <p className="text-content-secondary text-xs font-medium uppercase">Total Payable Amount</p>
                  <p className="text-xl font-semibold text-content-primary tabular-nums mt-0.5">৳ {totalCostBDT.toLocaleString()} BDT</p>
                </div>
                <div className="text-right">
                  <p className="text-content-secondary text-xs font-medium uppercase">Tokens</p>
                  <p className="text-base font-semibold text-content-primary tabular-nums">+{currentTokensToBuy} Pts</p>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <p className="text-content-secondary text-xs font-medium uppercase mb-2">Select Payment Category</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'mfs', label: 'Mobile Banking', icon: '📱' },
                    { id: 'card', label: 'Cards (Visa/MC)', icon: '💳' },
                    { id: 'bank', label: 'Net Banking', icon: '🏛️' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(m.id as any);
                        if (m.id === 'mfs') setSelectedProvider('bKash');
                        if (m.id === 'card') setSelectedProvider('VISA');
                        if (m.id === 'bank') setSelectedProvider('City Bank');
                      }}
                      className={`p-3 rounded border text-center transition flex flex-col items-center gap-1 ${
                        selectedMethod === m.id
                          ? 'border-brand-navy bg-app text-content-primary font-medium'
                          : 'border-subtle bg-surface text-content-secondary hover:bg-app'
                      }`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific Provider Selector */}
              <div>
                <p className="text-content-secondary text-xs font-medium uppercase mb-2">Select Provider</p>
                {selectedMethod === 'mfs' && (
                  <div className="grid grid-cols-4 gap-2">
                    {['bKash', 'Nagad', 'Rocket', 'Upay'].map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => setSelectedProvider(prov)}
                        className={`py-2 px-3 rounded border text-xs font-medium transition ${
                          selectedProvider === prov
                            ? 'border-brand-navy bg-app text-content-primary'
                            : 'border-subtle bg-surface text-content-secondary hover:bg-app'
                        }`}
                      >
                        {prov}
                      </button>
                    ))}
                  </div>
                )}

                {selectedMethod === 'card' && (
                  <div className="grid grid-cols-3 gap-2">
                    {['VISA', 'Mastercard', 'AMEX'].map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => setSelectedProvider(prov)}
                        className={`py-2 px-3 rounded border text-xs font-medium transition ${
                          selectedProvider === prov
                            ? 'border-brand-navy bg-app text-content-primary'
                            : 'border-subtle bg-surface text-content-secondary hover:bg-app'
                        }`}
                      >
                        {prov}
                      </button>
                    ))}
                  </div>
                )}

                {selectedMethod === 'bank' && (
                  <div className="grid grid-cols-3 gap-2">
                    {['City Bank', 'Islami Bank', 'BRAC Bank'].map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => setSelectedProvider(prov)}
                        className={`py-2 px-3 rounded border text-xs font-medium transition ${
                          selectedProvider === prov
                            ? 'border-brand-navy bg-app text-content-primary'
                            : 'border-subtle bg-surface text-content-secondary hover:bg-app'
                        }`}
                      >
                        {prov}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Demo Notice */}
              <div className="p-3 bg-status-pending-bg border border-subtle rounded flex items-start gap-2.5 text-xs text-status-pending-text">
                <svg className="w-4 h-4 text-status-pending-text flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong>Sandbox / Test Gateway:</strong> Clicking &apos;Complete Payment&apos; simulates an approved SSLCommerz webhook transaction and instantly credits your organization tokens.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setIsCheckoutOpen(false)}
                  disabled={isProcessing}
                  className="flex-1 h-9 bg-app hover:bg-slate-100 text-content-secondary font-medium rounded border border-subtle text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompletePurchase}
                  disabled={isProcessing}
                  className="flex-2 bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing with SSLCommerz...
                    </>
                  ) : (
                    <>
                      Complete Payment (৳ {totalCostBDT.toLocaleString()})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
