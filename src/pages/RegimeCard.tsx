import React, { use, useEffect, useMemo, useRef, useState } from "react";
import { MarketRegime, RuleTree } from "../model/MarketRegime";
import {
  INDEX_TICKERS,
  ORDER_TYPE,
  STOPLOSS_TYPE,
  TAKEPROFIT_TYPE,
  RISK_TIMING,
  RANKING_ORDERS,
  INDICATORS,
  UNIVERSES,
  SIGNAL_TIMING,
  REBALANCE,
  INDIVIDUAL_ETFS,
} from "../constants/options.ts";
import RulesEditor from "../pages/RulesEditor.tsx";
import RulesTreeEditor from "../pages/RuleTreeEditor.tsx";



interface Props {
  regime: MarketRegime;
  onUpdate: (r: MarketRegime) => void;
}

const RegimeCard: React.FC<Props> = ({ regime, onUpdate }) => {



  const makeEmptyTree = (): RuleTree => ({
    type: "group",
    id: "root",
    logic: "AND",
    children: [], // ✅ empty allowed
  });




  const [entryTree, setEntryTree] = useState<RuleTree>(() => regime.entry_rules_tree ?? makeEmptyTree());
  const [exitTree, setExitTree] = useState<RuleTree>(() => regime.exit_rules_tree ?? makeEmptyTree());

  const [freezeRulesTree, setFreezeRulesTree] = useState<RuleTree>(() => (regime as any).freeze_rules_tree ?? makeEmptyTree());
  const [resumeRulesTree, setResumeRulesTree] = useState<RuleTree>(() => (regime as any).resume_rules_tree ?? makeEmptyTree());
  const [useFreezeUnFreezeCheck, setUseFreezeUnFreezeCheck] = useState<boolean>(() => ((regime as any).freeze_rules_tree?.children?.length ?? 0) > 0);

  const isIndividualEtfSimple = (regime.regime_type === "Individual ETFs - Simple");
  const [marketTrendRulesTree, setMarketTrendRulesTree] = useState<RuleTree>(() => (regime as any).market_trend_rules_tree ?? makeEmptyTree());

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const selectedEtfs = useMemo(() => {
    if (!isIndividualEtfSimple) return [];
    const raw = (regime.universe || "").trim();
    if (!raw) return [];
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }, [isIndividualEtfSimple, regime.universe]);

  const toggleEtf = (ticker: string) => {
    const next = selectedEtfs.includes(ticker)
      ? selectedEtfs.filter((x) => x !== ticker)
      : [...selectedEtfs, ticker];

    onUpdate({ ...regime, universe: next.join(",") }); // ✅ still string
  };

  // UI state
  const [openEtfDropdown, setOpenEtfDropdown] = useState(false);
  const etfRef = useRef<HTMLDivElement | null>(null);

  // close when click outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!etfRef.current) return;
      if (!etfRef.current.contains(e.target as Node)) setOpenEtfDropdown(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);




  useEffect(() => {
    setEntryTree(regime.entry_rules_tree ?? makeEmptyTree());
    setExitTree(regime.exit_rules_tree ?? makeEmptyTree());
    setFreezeRulesTree(regime.freeze_rules_tree ?? makeEmptyTree());
    setResumeRulesTree(regime.resume_rules_tree ?? makeEmptyTree());
    setMarketTrendRulesTree(regime.market_trend_rules_tree ?? makeEmptyTree());


  }, [regime.id]);

  useEffect(() => {
    onUpdate({ ...regime, entry_rules_tree: entryTree });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryTree]);

  useEffect(() => {
    onUpdate({ ...regime, exit_rules_tree: exitTree });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitTree]);

  useEffect(() => {
    onUpdate({ ...regime, freeze_rules_tree: freezeRulesTree });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freezeRulesTree]);

  useEffect(() => {
    onUpdate({ ...regime, resume_rules_tree: resumeRulesTree });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeRulesTree]);


  useEffect(() => {
    onUpdate({ ...regime, market_trend_rules_tree: marketTrendRulesTree });
  }, [marketTrendRulesTree]);

  useEffect(() => {
    onUpdate({ ...regime, exit_rules_tree: exitTree });
  }, [regime.id]);

  // useEffect(() => {
  //   onUpdate({ ...(regime as any), use_volatility_tree: useVolatilityTree });
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [useVolatilityTree]);

  // useEffect(() => {
  //   onUpdate({ ...(regime as any), volatility_rules_tree: volatilityTree });
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [volatilityTree]);

  return (
    <div className="bg-white shadow-lg rounded-2xl border border-gray-300 p-6 space-y-8 hover:shadow-xl transition">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-xl font-bold text-indigo-700 tracking-wide">
          {regime.market_trend_type || regime.regime_type}
        </h3>

        {/* {(regime.regime_type === "Simple" || regime.regime_type === "Complex" || regime.regime_type === "Individual ETFs - Simple") && (
          <div className="flex flex-col">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Market Trend Ticker
            </label>
            <select
              value={regime.regime_ticker}
              onChange={(e) =>
                onUpdate({ ...regime, regime_ticker: e.target.value })
              }
              className="px-4 py-2 border rounded-lg text-base font-medium bg-gray-50 focus:ring-2 focus:ring-indigo-300"
            ><option value=""> Select Ticker</option>
              {Object.entries(INDEX_TICKERS).map(([key, label]) => (
                <option key={key} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )} */}

      </div>

      {/* Portfolio Basics */}
      <div className="bg-blue-50 rounded-lg p-4 border">
        <h4 className="text-lg font-bold text-blue-800 mb-3">
          📊 Portfolio Basics
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Universe */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Universe<span className="text-red-600">*</span>
            </label>

            {isIndividualEtfSimple ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">
                      {selectedEtfs.length > 0
                        ? selectedEtfs.map(key =>
                          INDIVIDUAL_ETFS.find(etf => etf.key === key)?.label
                        ).join(", ")
                        : "Select ETFs..."}
                    </span>
                    <svg className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
                    <div className="py-1">
                      {INDIVIDUAL_ETFS.map((etf) => (
                        <label
                          key={etf.key}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedEtfs.includes(etf.key)}
                            onChange={() => toggleEtf(etf.key)}
                          />
                          {etf.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <select
                value={regime.universe || ""}
                onChange={(e) => onUpdate({ ...regime, universe: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-blue-200"
              >
                <option value="">-- Select Universe --</option>
                {Object.entries(UNIVERSES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Capital */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Capital<span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={regime.capital || ""}
              onChange={(e) => onUpdate({ ...regime, capital: +e.target.value })}
              placeholder="e.g. 100000"
              className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-blue-200"
            />
          </div>

          {/* Slots */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Slots<span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              value={regime.slots || ""}
              onChange={(e) => onUpdate({ ...regime, slots: +e.target.value })}
              placeholder="e.g. 10"
              className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-blue-200"
            />
          </div>


          {/* <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Rebalance
      </label>
      <select
        value={strategy.rebalance || ""}
        onChange={(e) => onUpdate({ ...regime, rebalance: e.target.value })}
        className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-blue-200"
      >
        <option value="">-- Select Rebalance --</option>
        {Object.entries(REBALANCE).map(([key, label]) => (
          <option key={key} value={label}>
            {label}
          </option>
        ))}
      </select>
    </div> */}
        </div>
      </div>

      {(regime.regime_type === "Simple" ||
        regime.regime_type === "Complex" || regime.regime_type === "Individual ETFs - Simple") && (
          <div className="bg-indigo-50 rounded-lg p-4">
            <h4 className="text-lg font-bold text-indigo-800 mb-3">
              {regime.market_trend_type ? `(${regime.market_trend_type})` : ""}
            </h4>
            <RulesTreeEditor
              key="market-rules-editor"
              label=" 📈 Market Trend Rules"
              tree={marketTrendRulesTree}
              onChange={setMarketTrendRulesTree}
            />
          </div>
        )}

      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-lg font-bold text-yellow-800">
              ⚡ Volatility Cut Rules
            </h4>
            <p className="text-sm text-yellow-900/70 mt-1">
              Turn on to cut trades during volatility conditions and resume when conditions clear.
            </p>
          </div>

          {/* Switch */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useFreezeUnFreezeCheck}
              onChange={(e) => setUseFreezeUnFreezeCheck(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-300"
            />
            <span className="text-sm font-semibold text-yellow-900">
              {useFreezeUnFreezeCheck ? "ON" : "OFF"}
            </span>
          </label>
        </div>

        {/* Editor */}
        {useFreezeUnFreezeCheck ? (
          <div className="mt-4">
            <RulesTreeEditor
              key="freeze-rules-editor"
              label="Freeze Trading Rules"
              tree={freezeRulesTree}
              onChange={setFreezeRulesTree}
            />

            <RulesTreeEditor
              key="unfreeze-rules-editor"
              label="Resume Trading Rules"
              tree={resumeRulesTree}
              onChange={setResumeRulesTree}
            />
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-700">
            Volatility cut rules are disabled. The strategy will trade normally.
          </div>
        )}
      </div>

      {/* Rules Sections */}
      <div className="space-y-6">


        {regime.regime_type === "Complex" && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-yellow-800">
                  ⚡ Volatility Cut Rules
                </h4>
                <p className="text-sm text-yellow-900/70 mt-1">
                  Turn on to cut trades during volatility conditions and resume when conditions clear.
                </p>
              </div>

              {/* Switch */}
              {/* <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useVolatilityTree}
                onChange={(e) => setUseVolatilityTree(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-300"
              />
              <span className="text-sm font-semibold text-yellow-900">
                {useVolatilityTree ? "ON" : "OFF"}
              </span>
            </label> */}
            </div>

            {/* Editor */}
            {/* {useVolatilityTree ? (
            <div className="mt-4">
              <RulesTreeEditor
                key="volatility-editor"
                label="⚡ Volatility Cut Rules"
                tree={volatilityTree}
                onChange={setVolatilityTree}
              />
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-white px-3 py-2 text-sm text-gray-700">
              Volatility cut rules are disabled. The strategy will trade normally.
            </div>
          )} */}
          </div>
        )}


        <div className="bg-green-50 rounded-lg p-4">
          {/* <h4 className="text-lg font-bold text-green-800 mb-3">✅ Entry Rules<span className="text-red-600">*</span></h4>  */}
          {/* <RulesEditor
            label=""
            rules={regime.entry_rules}
            onChange={(rules) => onUpdate({ ...regime, entry_rules: rules })}
          /> */}


          <RulesTreeEditor
            key="entry-editor"
            label="✅ Entry Rules"
            tree={entryTree}
            onChange={setEntryTree}
          />


          {/* Summary */}
          {/* <div className="mt-4 flex items-center gap-2">
            <span className="shrink-0 text-sm font-semibold text-green-900">Summary:</span>

            <span className="w-full whitespace-pre-wrap break-words rounded-md border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm">
              {regime.entry_rules_labels?.trim() || "—"}
            </span>

          </div> */}



        </div>

        <div className="bg-red-50 rounded-lg p-4">
          {/* <h4 className="text-lg font-bold text-red-800 mb-3">❌ Exit Rules<span className="text-red-600">*</span></h4> */}
          {/* <RulesEditor
            label=""
            rules={regime.exit_rules}
            onChange={(rules) => onUpdate({ ...regime, exit_rules: rules })}
          /> */}
          <RulesTreeEditor
            key="exit-editor"
            label="❌ Exit Rules"
            tree={exitTree}
            onChange={setExitTree}
          />

          {/* Summary */}
          {/* <div className="mt-4 flex items-center gap-2">
            <span className="shrink-0 text-sm font-semibold text-green-900">Summary:</span>

            <span className="w-full whitespace-pre-wrap break-words rounded-md border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm">
              {regime.exit_rules_labels?.trim() || "—"}
            </span>

          </div> */}
        </div>
      </div>

      {/* Entry/Exit Timing */}
      <div className="bg-blue-50 rounded-lg p-4 border">
        <h4 className="text-lg font-bold text-blue-800 mb-3">
          Entry / Exit Timing
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Entry Timing */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Entry Timing<span className="text-red-600">*</span>
            </label>
            <select
              value={regime.entry_timing || ""}
              onChange={(e) => onUpdate({ ...regime, entry_timing: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-blue-200"
            >
              <option value="">-- Select Entry Timing --</option>
              {Object.entries(SIGNAL_TIMING).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Exit Timing<span className="text-red-600">*</span>
            </label>
            <select
              value={regime.exit_timing || ""}
              onChange={(e) => onUpdate({ ...regime, exit_timing: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-blue-200"
            >
              <option value="">-- Select Exit Timing --</option>
              {Object.entries(SIGNAL_TIMING).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>


      {/* Risk & Portfolio Parameters */}
      <div className="pt-4 border-t">
        <h4 className="text-lg font-bold text-gray-800 mb-4">
          🎯 Risk & Portfolio Parameters
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Stoploss Section */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h5 className="font-bold text-gray-900 mb-3">Stoploss</h5>

            
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stoploss Type
                </label>
                <select
                  value={regime.stoploss_type || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, stoploss_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                >
                  <option value="">-- Select --</option>
                  {Object.entries(STOPLOSS_TYPE).map(([key, label]) => (
                    <option key={key} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

          
            <div className="space-y-3">
              {regime.stoploss_type !== "DOLLAR_BASED" && ( 
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stoploss %
                </label>
                <input
                  type="number"
                  value={regime.stoploss_pct || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, stoploss_pct: +e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-red-200"
                  placeholder="e.g. 5"
                />
              </div>
            )}

            {regime.stoploss_type === "DOLLAR_BASED" && ( 
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stoploss Dollar
                </label>
                <input
                  type="number"
                  value={regime.stoploss_dollar || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, stoploss_dollar: +e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-red-200"
                  placeholder="e.g. 5"
                />
              </div>
            )}

              {regime.stoploss_type === "ATR_BASED" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ATR Lookback (Stoploss)
                  </label>
                  <input
                    type="number"
                    value={regime.atr_lookback_stp || ""}
                    onChange={(e) =>
                      onUpdate({
                        ...regime,
                        atr_lookback_stp: +e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-red-200"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stoploss Timing
                </label>
                <select
                  value={regime.stoploss_timing || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, stoploss_timing: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                >
                  <option value="">-- Select --</option>
                  {Object.entries(RISK_TIMING).map(([key, label]) => (
                    <option key={key} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Takeprofit Section */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h5 className="font-bold text-gray-900 mb-3">Takeprofit</h5>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Takeprofit Type
                </label>
                <select
                  value={regime.takeprofit_type || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, takeprofit_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                >
                  <option value="">-- Select --</option>
                  {Object.entries(TAKEPROFIT_TYPE).map(([key, label]) => (
                    <option key={key} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
          
            <div className="space-y-3">
            {regime.takeprofit_type !== "DOLLAR_BASED" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Takeprofit %
                </label>
                <input
                  type="number"
                  value={regime.takeprofit_pct || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, takeprofit_pct: +e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-green-200"
                  placeholder="e.g. 15"
                />
              </div>
            )}

            {regime.takeprofit_type == "DOLLAR_BASED" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Takeprofit Dollar Amount
                </label>
                <input
                  type="number"
                  value={regime.takeprofit_dollar || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, takeprofit_dollar: +e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-green-200"
                  placeholder="e.g. 15"
                />
              </div>
            )}


              {regime.takeprofit_type === "ATR_BASED" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ATR Lookback (Takeprofit)
                  </label>
                  <input
                    type="number"
                    value={regime.atr_lookback_tp || ""}
                    onChange={(e) =>
                      onUpdate({
                        ...regime,
                        atr_lookback_tp: +e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-green-200"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Takeprofit Timing
                </label>
                <select
                  value={regime.takeprofit_timing || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, takeprofit_timing: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                >
                  <option value="">-- Select --</option>
                  {Object.entries(RISK_TIMING).map(([key, label]) => (
                    <option key={key} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Order Section */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h5 className="font-bold text-gray-900 mb-3">Order Settings</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Order Type <span className="text-red-600">*</span>
                </label>

                <select
                  value={regime.order_type || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, order_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                >
                  <option value="">-- Select --</option>
                  {Object.entries(ORDER_TYPE).map(([key, label]) => (
                    <option key={key} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {(regime.order_type === "LIMIT" ||
                regime.order_type === "LIMIT_ATR") && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Limit %
                    </label>
                    <input
                      type="number"
                      value={regime.limit_pct || ""}
                      onChange={(e) =>
                        onUpdate({ ...regime, limit_pct: +e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                    />
                  </div>
                )}

              {regime.order_type === "LIMIT_ATR" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ATR Lookback (Limit)
                  </label>
                  <input
                    type="number"
                    value={regime.atr_limit_lookback || ""}
                    onChange={(e) =>
                      onUpdate({
                        ...regime,
                        atr_limit_lookback: +e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Max Time
                </label>
                <input
                  type="number"
                  value={regime.max_time || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, max_time: +e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                />
              </div>
            </div>
          </div>

          {/* Ranking Section */}
          {( regime.regime_type !== "Individual ETFs - Simple") && (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h5 className="font-bold text-gray-900 mb-3">Ranking</h5>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Ranking Indicator <span className="text-red-600">*</span>
                </label>
                <select
                  value={regime.ranking || ""}
                  onChange={(e) => onUpdate({ ...regime, ranking: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                >
                  <option value="">-- Select --</option>
                  {Object.entries(INDICATORS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Ranking Lookback<span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={regime.ranking_lookback || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...regime,
                      ranking_lookback: +e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Ranking Order<span className="text-red-600">*</span>
                </label>
                <select
                  value={regime.ranking_order || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, ranking_order: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                >
                  <option value="">-- Select --</option>
                  {Object.entries(RANKING_ORDERS).map(([key, label]) => (
                    <option key={key} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
            )}
          {/* Banned Months Section */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h5 className="font-bold text-gray-900 mb-3">Banned Months</h5>

            <div className="grid grid-cols-6 sm:grid-cols-6 gap-2 text-center">
              {[
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
              ].map((label, idx) => {
                const monthNum = idx + 1;
                const isBanned = regime.banned_months?.includes(monthNum) || false;

                return (
                  <button
                    key={label}
                    onClick={() => {
                      const newMonths = isBanned
                        ? (regime.banned_months || []).filter((m) => m !== monthNum)
                        : [...(regime.banned_months || []), monthNum];
                      onUpdate({ ...regime, banned_months: newMonths });
                    }}
                    className={`text-xs sm:text-sm font-medium px-2.5 py-1.5 rounded-full border transition 
            ${isBanned
                        ? "bg-red-100 border-red-400 text-red-700 hover:bg-red-200"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Click months to <span className="font-semibold text-red-600">exclude</span> from trading.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RegimeCard;
