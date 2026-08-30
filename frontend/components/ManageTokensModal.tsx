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
        className="fixed inset-0 bg-navy-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scale-up">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white px-6 md:px-8 py-5 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg className="w-6 h-6 text-navy-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Organization Token Wallet</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-amber-300 border border-amber-400/20">
                  Shared Balance
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-0.5">{orgName} — Shared across all team members</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 md:px-8 pt-4 pb-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('buy');
                setPurchaseSuccess(null);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'buy'
                  ? 'bg-navy-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-navy-900'
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
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-navy-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-navy-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Transaction History
            </button>
          </div>

          {/* Quick Balance indicator */}
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-xl">
            <span className="text-xs font-semibold text-slate-500">Current Balance:</span>
            <span className="text-base font-black text-amber-600 flex items-center gap-1">
              {loading ? '...' : balance.toLocaleString()}
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {activeTab === 'buy' ? (
            <>
              {purchaseSuccess ? (
                /* Success celebration screen */
                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center space-y-5 animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-navy-900">Token Purchase Successful!</h3>
                    <p className="text-slate-600 text-sm mt-1">
                      Your organization token balance has been updated immediately.
                    </p>
                  </div>

                  <div className="max-w-md mx-auto bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm grid grid-cols-2 gap-4 text-left">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Tokens Added</p>
                      <p className="text-xl font-black text-emerald-600 mt-0.5">+{purchaseSuccess.tokens} Tokens</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">New Balance</p>
                      <p className="text-xl font-black text-navy-900 mt-0.5">{purchaseSuccess.newBalance} Tokens</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Amount Paid</p>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">৳ {purchaseSuccess.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Reference ID</p>
                      <p className="text-xs font-mono font-bold text-slate-600 mt-0.5">{purchaseSuccess.reference}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setPurchaseSuccess(null)}
                      className="px-6 py-2.5 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition shadow-md text-sm"
                    >
                      Buy More Tokens
                    </button>
                    <button
                      onClick={onClose}
                      className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition text-sm"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Balance Hero Card - High Contrast, Crystal Clear */}
                  <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-slate-900 border border-slate-700/80 text-white rounded-3xl p-6 md:p-7 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                    
                    <div className="relative z-10 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">
                          Total Shared Balance
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                          Live
                        </span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-4xl md:text-5xl font-black text-white tracking-tight">
                          {loading ? '...' : balance.toLocaleString()}
                        </span>
                        <span className="text-xl font-black text-amber-400 flex items-center gap-1.5">
                          Tokens
                          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 pt-1 flex items-center gap-1.5">
                        Equivalent Value: <span className="font-extrabold text-emerald-400 text-sm">৳ {(balance * pricing.price_per_token).toLocaleString()} BDT</span>
                      </p>
                    </div>

                    {/* Platform Rates Info Box (High contrast, crystal clear) */}
                    <div className="relative z-10 bg-slate-950/95 border border-slate-700/90 rounded-2xl p-4 md:p-5 shadow-2xl min-w-[270px] space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Platform Rates
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Standard</span>
                      </div>
                      <div className="flex flex-col gap-2 text-xs">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-300 font-medium">1 Token Cost:</span>
                          <span className="font-black text-white bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
                            ৳ {pricing.price_per_token.toFixed(2)} BDT
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-300 font-medium">Publish Tender:</span>
                          <span className="font-black text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                            {pricing.tender_publish_cost} Tokens
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-300 font-medium">Submit Bid:</span>
                          <span className="font-black text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
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
                        <h3 className="text-base font-bold text-navy-900">Select Token Package</h3>
                        <p className="text-xs text-slate-500">Choose a discounted bundle or enter a custom amount</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        ⚡ Instant Credit
                      </span>
                    </div>

                    {loadingPackages ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-pulse">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="h-32 bg-slate-100 rounded-2xl border border-slate-200" />
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
                              className={`relative cursor-pointer rounded-2xl p-4 border-2 transition-all duration-200 flex flex-col justify-between group ${
                                isSelected
                                  ? 'border-amber-500 bg-amber-50/60 shadow-lg shadow-amber-500/10 scale-[1.02]'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                              }`}
                            >
                              {/* Custom Badge or Savings badge */}
                              {pkg.badge ? (
                                <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-navy-950 font-black text-[10px] rounded-full uppercase shadow">
                                  {pkg.badge}
                                </span>
                              ) : pkg.savings_percentage > 0 ? (
                                <span className="absolute -top-2.5 right-3 px-2.5 py-0.5 bg-emerald-600 text-white font-black text-[10px] rounded-full uppercase shadow">
                                  Save {pkg.savings_percentage}%
                                </span>
                              ) : null}

                              <div>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{pkg.package_name}</p>
                                </div>
                                <p className="text-2xl font-black text-navy-900 mt-1 flex items-center gap-1.5">
                                  {pkg.token_amount.toLocaleString()}
                                  <span className="text-xs font-bold text-slate-400">Tokens</span>
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
                                <div>
                                  {pkg.savings_percentage > 0 && (
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[11px] text-slate-400 line-through">
                                        ৳{pkg.original_price_bdt.toLocaleString()}
                                      </span>
                                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                        Save {pkg.savings_percentage}%
                                      </span>
                                    </div>
                                  )}
                                  <div className="text-base font-black text-navy-900">
                                    ৳ {pkg.price_bdt.toLocaleString()}
                                  </div>
                                </div>

                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                                  isSelected ? 'bg-amber-500 text-navy-950' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
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
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="custom-toggle"
                        checked={isCustom}
                        onChange={(e) => setIsCustom(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <label htmlFor="custom-toggle" className="text-sm font-bold text-navy-900 cursor-pointer">
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
                            className="w-full pl-4 pr-16 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm font-bold text-navy-900 bg-white"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            Tokens
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-navy-900 whitespace-nowrap">
                          <span className="text-slate-500 font-normal">Total:</span>
                          <span className="text-lg text-emerald-600 font-black">৳ {totalCostBDT.toLocaleString()} BDT</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Purchase CTA Summary */}
                  <div className="bg-gradient-to-r from-slate-900 to-navy-900 border border-slate-800 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                    <div>
                      <p className="text-xs text-slate-400">You are purchasing:</p>
                      <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                        <span className="text-2xl font-black text-amber-400">{currentTokensToBuy.toLocaleString()} Tokens</span>
                        <span className="text-sm text-slate-300">
                          for <strong className="text-white text-base">৳ {totalCostBDT.toLocaleString()} BDT</strong>
                        </span>
                        {savingsBDT > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Saving ৳{savingsBDT.toLocaleString()} (-{savingsPct}%)
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleStartCheckout}
                      disabled={currentTokensToBuy <= 0}
                      className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-navy-950 font-black rounded-xl hover:from-amber-300 hover:to-yellow-400 transition-all duration-200 shadow-lg shadow-amber-500/20 hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <svg className="w-5 h-5 text-navy-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-navy-900">Organization Ledger</h3>
                  <p className="text-xs text-slate-500">Full audit log of token credits, tender submissions, and bids.</p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(['all', 'purchase', 'deduct'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setHistoryFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition capitalize ${
                        historyFilter === filter
                          ? 'bg-white text-navy-900 shadow-sm'
                          : 'text-slate-500 hover:text-navy-900'
                      }`}
                    >
                      {filter === 'all' ? 'All Transactions' : filter === 'purchase' ? 'Purchases' : 'Deductions'}
                    </button>
                  ))}
                </div>
              </div>

              {historyLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <svg className="animate-spin h-8 w-8 text-amber-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading transaction history...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                  <svg className="w-12 h-12 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  No transactions found for this filter.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                        <th className="px-4 py-3">Date & Time</th>
                        <th className="px-4 py-3">Action / Description</th>
                        <th className="px-4 py-3">Initiated By</th>
                        <th className="px-4 py-3">Tokens</th>
                        <th className="px-4 py-3">Balance After</th>
                        <th className="px-4 py-3">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
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
                          <tr key={tx.transaction_id} className="hover:bg-slate-50/70 transition">
                            <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                              {dateFormatted}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-navy-900">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    isCredit ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                />
                                <div>
                                  <p className="text-xs font-bold text-navy-900">{tx.description || tx.transaction_type}</p>
                                  {tx.payment_method && (
                                    <p className="text-[11px] text-slate-400">{tx.payment_method}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-600">
                              {tx.user_name || 'System / Platform'}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${
                                  isCredit
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {isCredit ? `+${Math.abs(tx.amount)}` : `-${Math.abs(tx.amount)}`}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                              {tx.balance_after.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 text-xs font-mono text-slate-400 whitespace-nowrap">
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
        <div className="px-6 md:px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>SSLCommerz 256-Bit Encrypted Payment Channel</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition text-xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* SSLCommerz Simulated Payment Gateway Overlay Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">
            {/* Gateway Header */}
            <div className="bg-[#002b49] text-white px-6 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-amber-400">
                  SSL
                </div>
                <div>
                  <h4 className="font-bold text-sm">SSLCOMMERZ Payment Gateway</h4>
                  <p className="text-[11px] text-slate-300">ProcureNext Monetization Channel</p>
                </div>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
            </div>

            {/* Gateway Body */}
            <div className="p-6 space-y-5">
              {/* Amount Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Payable Amount</p>
                  <p className="text-2xl font-black text-navy-900 mt-0.5">৳ {totalCostBDT.toLocaleString()} BDT</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Tokens</p>
                  <p className="text-lg font-black text-amber-600">+{currentTokensToBuy} Pts</p>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Select Payment Category</p>
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
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        selectedMethod === m.id
                          ? 'border-amber-500 bg-amber-50/50 text-navy-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Select Provider</p>
                {selectedMethod === 'mfs' && (
                  <div className="grid grid-cols-4 gap-2">
                    {['bKash', 'Nagad', 'Rocket', 'Upay'].map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => setSelectedProvider(prov)}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                          selectedProvider === prov
                            ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                          selectedProvider === prov
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                          selectedProvider === prov
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {prov}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Demo Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompletePurchase}
                  disabled={isProcessing}
                  className="flex-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-sm transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
