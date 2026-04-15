import React, { use, useEffect, useMemo, useRef, useState } from "react";
import { MarketRegime, RuleTree, TdomFilter, VolFilter } from "../model/MarketRegime";
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
import { getRegimeConfig } from "../config/regimeConfig.ts";



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

  // ── Config-driven isolation: ETF vs Equity ──
  const config = getRegimeConfig(regime.regime_type);
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

        {/* regime_ticker moved to Market Trend Rules section */}

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

      {config.features.marketTrendRules && (
          <div className="bg-indigo-50 rounded-lg p-4">
            <h4 className="text-lg font-bold text-indigo-800 mb-3">
              {regime.market_trend_type ? `(${regime.market_trend_type})` : ""}
            </h4>

            {/* Ticker is now per-rule inside the Market Trend Rules editor */}

            <RulesTreeEditor
              key="market-rules-editor"
              label=" 📈 Market Trend Rules"
              tree={marketTrendRulesTree}
              onChange={setMarketTrendRulesTree}
              indicators={config.indicators.marketTrend}
              marketIndicators={config.indicators.marketTrend}
              tickerOptions={INDEX_TICKERS}
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
              indicators={config.indicators.freeze}
              marketIndicators={config.indicators.freeze}
            />

            <RulesTreeEditor
              key="unfreeze-rules-editor"
              label="Resume Trading Rules"
              tree={resumeRulesTree}
              onChange={setResumeRulesTree}
              indicators={config.indicators.freeze}
              marketIndicators={config.indicators.freeze}
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


        {config.features.volatilityRules && (
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
                indicators={config.indicators.freeze}
                marketIndicators={config.indicators.freeze}
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
            indicators={config.indicators.entry}
            marketIndicators={config.indicators.valueIndicators}
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
            indicators={config.indicators.entry}
            marketIndicators={config.indicators.valueIndicators}
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

        {/* Look Inside Bar toggle — ETF only */}
        {config.features.lookInsideBar && (
        <label className="inline-flex items-center gap-3 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={regime.is_look_inside_bar || false}
            onChange={(e) =>
              onUpdate({ ...regime, is_look_inside_bar: e.target.checked })
            }
            className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-300"
          />
          <div>
            <span className="text-sm font-bold text-gray-700">Look Inside Bar</span>
            <p className="text-xs text-gray-500">
              When enabled, stoploss and takeprofit are evaluated on minute-bar data.
              When disabled, they use daily bar data only.
            </p>
          </div>
        </label>
        )}

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
                  {Object.entries(RISK_TIMING)
                    .filter(([key]) => config.features.intradayTiming || key !== "intraday")
                    .map(([key, label]) => (
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
                  {Object.entries(RISK_TIMING)
                    .filter(([key]) => config.features.intradayTiming || key !== "intraday")
                    .map(([key, label]) => (
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
          {config.features.ranking && (
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Sector Level
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={regime.sector_level || ""}
                    placeholder="0 = disabled"
                    onChange={(e) =>
                      onUpdate({
                        ...regime,
                        sector_level: +e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Max Per Sector
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={regime.sector_limit || ""}
                    placeholder="0 = disabled"
                    onChange={(e) =>
                      onUpdate({
                        ...regime,
                        sector_limit: +e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                  />
                </div>
              </div>
            </div>
          </div>
            )}
          {/* Gap Filter Section */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h5 className="font-bold text-gray-900 mb-3">Gap Filter</h5>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Max Gap % (skip entries gapping beyond this %)
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={regime.gap_filter_pct || ""}
                placeholder="0 = disabled"
                onChange={(e) =>
                  onUpdate({
                    ...regime,
                    gap_filter_pct: +e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              />
            </div>
          </div>
          {/* Max Duplicates Section */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h5 className="font-bold text-gray-900 mb-3">Duplicate Positions</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Max Per Ticker
                </label>
                <input
                  type="number"
                  min={0}
                  value={regime.max_duplicates || ""}
                  placeholder="1 = no duplicates"
                  onChange={(e) =>
                    onUpdate({
                      ...regime,
                      max_duplicates: +e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Max Duplicate Pairs
                </label>
                <input
                  type="number"
                  min={0}
                  value={regime.max_duplicate_sets || ""}
                  placeholder="0 = no limit"
                  onChange={(e) =>
                    onUpdate({
                      ...regime,
                      max_duplicate_sets: +e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                />
              </div>
            </div>
          </div>
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

          {/* TDOM Filters Section */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h5 className="font-bold text-gray-900">TDOM Filters</h5>
                <p className="text-xs text-gray-500 mt-0.5">
                  Block entries on a specific trading-day-of-month position or weekday, for selected months only.
                </p>
              </div>
              <button
                onClick={() =>
                  onUpdate({
                    ...regime,
                    tdom_filters: [
                      ...(regime.tdom_filters || []),
                      { banned_months: [] },
                    ],
                  })
                }
                className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition whitespace-nowrap"
              >
                + Add Rule
              </button>
            </div>

            {(!regime.tdom_filters || regime.tdom_filters.length === 0) && (
              <p className="text-xs text-gray-400 italic text-center py-2">
                No TDOM filter rules. Click "+ Add Rule" to create one.
              </p>
            )}

            {(regime.tdom_filters || []).map((filter: TdomFilter, fi: number) => {
              const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              const TDOM_LABELS  = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th"];
              const WD_LABELS    = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

              // Encode current selection as a single string for the <select>
              // Use != null (not !== undefined) so that JSON null values are handled correctly
              const selectValue =
                filter.tdom != null
                  ? `tdom_${filter.tdom}`
                  : filter.weekday != null
                  ? `wd_${filter.weekday}`
                  : "";

              const handleTypeChange = (val: string) => {
                const updated = [...(regime.tdom_filters || [])];
                if (val.startsWith("tdom_")) {
                  const n = parseInt(val.split("_")[1], 10);
                  updated[fi] = { banned_months: filter.banned_months, tdom: n };
                } else if (val.startsWith("wd_")) {
                  const n = parseInt(val.split("_")[1], 10);
                  updated[fi] = { banned_months: filter.banned_months, weekday: n };
                } else {
                  updated[fi] = { banned_months: filter.banned_months };
                }
                onUpdate({ ...regime, tdom_filters: updated });
              };

              const handleMonthToggle = (monthNum: number) => {
                const updated = [...(regime.tdom_filters || [])];
                const already = filter.banned_months.includes(monthNum);
                updated[fi] = {
                  ...filter,
                  banned_months: already
                    ? filter.banned_months.filter((m) => m !== monthNum)
                    : [...filter.banned_months, monthNum],
                };
                onUpdate({ ...regime, tdom_filters: updated });
              };

              const handleRemove = () => {
                const updated = (regime.tdom_filters || []).filter((_, i) => i !== fi);
                onUpdate({ ...regime, tdom_filters: updated });
              };

              return (
                <div
                  key={fi}
                  className="mb-3 p-3 bg-white border rounded-lg"
                >
                  {/* Rule header row */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold text-gray-500 w-16 shrink-0">
                      Rule {fi + 1}
                    </span>

                    {/* Type selector */}
                    <select
                      value={selectValue}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      className="text-sm border rounded-lg px-2 py-1.5 bg-white focus:ring focus:ring-indigo-200 flex-1 min-w-0"
                    >
                      <option value="">-- Select day type --</option>
                      <optgroup label="Trading Day of Month (0-based)">
                        {TDOM_LABELS.map((label, n) => (
                          <option key={`tdom_${n}`} value={`tdom_${n}`}>
                            {label} trading day of month (TDOM {n})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Day of Week">
                        {WD_LABELS.map((label, n) => (
                          <option key={`wd_${n}`} value={`wd_${n}`}>
                            Every {label} (weekday {n})
                          </option>
                        ))}
                      </optgroup>
                    </select>

                    {/* Remove button */}
                    <button
                      onClick={handleRemove}
                      className="text-red-400 hover:text-red-600 text-xl font-bold leading-none shrink-0"
                      title="Remove rule"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Month toggles */}
                  <div className="flex flex-wrap gap-1.5 mt-1 pl-16">
                    {MONTH_LABELS.map((label, idx) => {
                      const monthNum = idx + 1;
                      const active = filter.banned_months.includes(monthNum);
                      return (
                        <button
                          key={label}
                          onClick={() => handleMonthToggle(monthNum)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border transition
                            ${active
                              ? "bg-red-100 border-red-400 text-red-700 hover:bg-red-200"
                              : "bg-white border-gray-300 text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Summary line */}
                  {selectValue && filter.banned_months.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2 pl-16">
                      Block entries on{" "}
                      <span className="font-semibold text-gray-700">
                        {selectValue.startsWith("tdom_")
                          ? `${TDOM_LABELS[parseInt(selectValue.split("_")[1], 10)]} trading day`
                          : `every ${WD_LABELS[parseInt(selectValue.split("_")[1], 10)]}`}
                      </span>{" "}
                      when month is in:{" "}
                      <span className="font-semibold text-red-600">
                        {filter.banned_months
                          .sort((a, b) => a - b)
                          .map((m) => MONTH_LABELS[m - 1])
                          .join(", ")}
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Vol / Turnover Filter Section */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h5 className="font-bold text-gray-900">Vol / Turnover Filter</h5>
                <p className="text-xs text-gray-500 mt-0.5">
                  Yearly-recalculated universe-wide percentile thresholds. Entries below the
                  threshold are excluded. Triggered on the 1st January trading day each year.
                </p>
              </div>
              {/* Enable toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-sm text-gray-600">
                  {regime.vol_filter?.enabled ? "Enabled" : "Disabled"}
                </span>
                <div
                  onClick={() => {
                    const current = regime.vol_filter;
                    const next: VolFilter = current?.enabled
                      ? { ...current, enabled: false }
                      : {
                          enabled: true,
                          spy_ticker: current?.spy_ticker ?? "spy",
                          vol_pct_bull: current?.vol_pct_bull ?? 0.20,
                          vol_pct_bear: current?.vol_pct_bear ?? 0.45,
                          turnover_pct_bull: current?.turnover_pct_bull ?? 0.35,
                          turnover_pct_bear: current?.turnover_pct_bear ?? 0.05,
                        };
                    onUpdate({ ...regime, vol_filter: next });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex items-center px-1
                    ${regime.vol_filter?.enabled ? "bg-indigo-600" : "bg-gray-300"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow transition-transform
                      ${regime.vol_filter?.enabled ? "translate-x-5" : "translate-x-0"}`}
                  />
                </div>
              </label>
            </div>

            {regime.vol_filter?.enabled && (
              <div className="mt-3 space-y-3">
                {/* SPY ticker */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-32 shrink-0">SPY Ticker</label>
                  <input
                    type="text"
                    value={regime.vol_filter?.spy_ticker ?? "spy"}
                    onChange={(e) =>
                      onUpdate({
                        ...regime,
                        vol_filter: { ...(regime.vol_filter as VolFilter), spy_ticker: e.target.value },
                      })
                    }
                    className="text-sm border rounded-lg px-2 py-1.5 w-28 focus:ring focus:ring-indigo-200"
                    placeholder="spy"
                  />
                  <span className="text-xs text-gray-400">
                    Used to compute SMA(200) for bull/bear regime detection
                  </span>
                </div>

                {/* Percentile grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Vol Bull */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Volume — Bull (SPY &gt; SMA200)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0} max={1} step={0.01}
                        value={regime.vol_filter?.vol_pct_bull ?? 0.20}
                        onChange={(e) =>
                          onUpdate({
                            ...regime,
                            vol_filter: { ...(regime.vol_filter as VolFilter), vol_pct_bull: +e.target.value },
                          })
                        }
                        className="text-sm border rounded-lg px-2 py-1.5 w-24 focus:ring focus:ring-indigo-200"
                      />
                      <span className="text-xs text-gray-400">bottom fraction excluded</span>
                    </div>
                  </div>

                  {/* Vol Bear */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Volume — Bear (SPY ≤ SMA200)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0} max={1} step={0.01}
                        value={regime.vol_filter?.vol_pct_bear ?? 0.45}
                        onChange={(e) =>
                          onUpdate({
                            ...regime,
                            vol_filter: { ...(regime.vol_filter as VolFilter), vol_pct_bear: +e.target.value },
                          })
                        }
                        className="text-sm border rounded-lg px-2 py-1.5 w-24 focus:ring focus:ring-indigo-200"
                      />
                      <span className="text-xs text-gray-400">bottom fraction excluded</span>
                    </div>
                  </div>

                  {/* Turnover Bull */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Turnover — Bull (SPY &gt; SMA200)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0} max={1} step={0.01}
                        value={regime.vol_filter?.turnover_pct_bull ?? 0.35}
                        onChange={(e) =>
                          onUpdate({
                            ...regime,
                            vol_filter: { ...(regime.vol_filter as VolFilter), turnover_pct_bull: +e.target.value },
                          })
                        }
                        className="text-sm border rounded-lg px-2 py-1.5 w-24 focus:ring focus:ring-indigo-200"
                      />
                      <span className="text-xs text-gray-400">bottom fraction excluded</span>
                    </div>
                  </div>

                  {/* Turnover Bear */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Turnover — Bear (SPY ≤ SMA200)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0} max={1} step={0.01}
                        value={regime.vol_filter?.turnover_pct_bear ?? 0.05}
                        onChange={(e) =>
                          onUpdate({
                            ...regime,
                            vol_filter: { ...(regime.vol_filter as VolFilter), turnover_pct_bear: +e.target.value },
                          })
                        }
                        className="text-sm border rounded-lg px-2 py-1.5 w-24 focus:ring focus:ring-indigo-200"
                      />
                      <span className="text-xs text-gray-400">bottom fraction excluded</span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs text-gray-500 pt-1 border-t mt-2">
                  CRDT_1 defaults: Vol bull=0.20, bear=0.45 · Turnover bull=0.35, bear=0.05
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default RegimeCard;