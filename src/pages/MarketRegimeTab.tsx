import React, { useEffect, useState } from "react";
import { MarketRegime } from "../model/MarketRegime";
import RegimeCard from "../pages/RegimeCard.tsx";
import { Strategy } from "../model/Strategy.ts";
import { fetchMarketRegimes, runBacktest, saveMarketRegime } from "../services/strategyService.ts";

interface MarketRegimeTabProps {
  strategy: Strategy; 
  onSave?: (strategy: Strategy, regimes: MarketRegime[]) => Promise<void>;
  onRunBacktest?: (strategy: Strategy, regimes: MarketRegime[]) => Promise<void>;
}

const MarketRegimeTab: React.FC<MarketRegimeTabProps> = ({
  strategy,
  onSave,
  onRunBacktest,
}) => {
  const [regimeType, setRegimeType] = useState<string>(
    strategy.market_regime_type || ""
  );
  const [regimes, setRegimes] = useState<MarketRegime[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const generateRegimes = (type: string) => {
    let base: MarketRegime[] = [];
    if (type === "Normal") {
      base = [
        {
          strategy_id: strategy.id,
          regime_type: type,
          regime_ticker: "",
          entry_rules: [],
          exit_rules: [],
        },
      ];
    } else if (type === "Simple") {
      base = [
        {
          strategy_id: strategy.id,
          regime_type: type,
          regime_ticker: "",
          market_trend_type: "",
          entry_rules: [],
          exit_rules: [],
        }
      ];
    } else if (type === "Complex") {
      base = [
        {
          strategy_id: strategy.id,
          regime_type: type,
          regime_ticker: "",
          market_trend_type: "",
          entry_rules: [],
          exit_rules: [],
          volatility_rules: [],
        },
      ];
    }
    setRegimes(base);
    setRegimeType(type);
  };

useEffect(() => {
  const init = async () => {
    if (strategy.id) {
      try {
        const data = await fetchMarketRegimes(strategy.id);
        if (data.length > 0) {
          setRegimes(data);
          setRegimeType(data[0].regime_type); // all share same type
        } else if (strategy.market_regime_type) {
          // First time → generate empty regime(s)
          generateRegimes(strategy.market_regime_type);
        }
      } catch (err) {
        console.error("Failed to load market regimes", err);
      }
    }
  };
  init();
}, [strategy.id, strategy.market_regime_type]);


  const handleAddRegime = () => {
    setRegimes([
      ...regimes,
      {
        strategy_id: strategy.id,
        regime_type: regimeType || "Normal",
        regime_ticker: "SPY",
        entry_rules: [],
        exit_rules: [],
      },
    ]);
  };
  const validateRegime = (r: MarketRegime) => {
    const missing: string[] = [];

    // if (!r.entry_rules?.length) missing.push("Entry rules");
    // if (!r.exit_rules?.length) missing.push("Exit rules");

    if (!r.entry_timing) missing.push("Entry timing");
    if (!r.exit_timing) missing.push("Exit timing");

    if (!r.order_type) missing.push("Order type");

    if (!r.ranking && r.regime_type != 'Individual ETFs - Simple') missing.push("Ranking indicator");
    if (!r.ranking_lookback && r.regime_type != 'Individual ETFs - Simple') missing.push("Ranking lookback");
    if (!r.ranking_order && r.regime_type != 'Individual ETFs - Simple') missing.push("Ranking order");

    return missing;
  };

const allValid = regimes.every((r) => validateRegime(r).length === 0);

// const handleSave = async () => {
//   setLoading(true);
//   setMessage("Saving strategy…");

//   try {
//     // Save each regime (create or update)
//     for (const regime of regimes) {
//         regime.strategy_id = strategy.id; // Ensure regime has the correct strategy_id

//         for (const rule of regime.market_trend_rules || []) {
//             if(rule.value_type !== "value") {
//                 rule.value = 0; // or some other default
//             }
//         }

//       const res = await saveMarketRegime(regime);
//       if(!regime.id){
//         regime.id = res.id; // update with returned id
//       }
//       console.log("saveMarketRegime response:", res);
//       console.log("saved regime:", regime.id, "->", res);
//     }
//     setMessage("✅ Strategy & Regimes saved successfully");
//   } catch (err) {
//     console.error(err);
//     setMessage("❌ Failed to save strategy");
//   } finally {
//     setLoading(false);
//   }
// };
const handleSave = async () => {
  setLoading(true);
  setMessage("Saving strategy…");

  try {
    // Validate all regimes first (simple + user-friendly)
    for (let i = 0; i < regimes.length; i++) {
      const missing = validateRegime(regimes[i]);
      if (missing.length) {
        setMessage(`❌ Regime ${i + 1}: missing ${missing.join(", ")}`);
        setLoading(false);
        return;
      }
    }

    const updatedRegimes: MarketRegime[] = [];

    for (const regime of regimes) {
      console.log(regime)
      const payload: MarketRegime = {
        ...regime,
        strategy_id: strategy.id, // safe
        market_trend_rules: (regime.market_trend_rules || []).map((rule) => ({
          ...rule,
          value: rule.value_type !== "value" ? 0 : rule.value, // normalize without mutating
        })),
      };

      const res = await saveMarketRegime(payload);

      console.log("saveMarketRegime response:", res);

      // keep state in sync (especially id after create)
      updatedRegimes.push({
        ...regime,
        id: regime.id ?? res.id,
      });
    }

    setRegimes(updatedRegimes);
    setMessage("✅ Strategy & Regimes saved successfully");
  } catch (err) {
    console.error(err);
    setMessage("❌ Failed to save strategy");
  } finally {
    setLoading(false);
  }
};


const getFirstInvalid = () => {
  for (let i = 0; i < regimes.length; i++) {
    const missing = validateRegime(regimes[i]);
    if (missing.length) return { index: i, missing };
  }
  return null;
};

const firstInvalid = getFirstInvalid();

const handleRunBacktest = async () => {
  setLoading(true);
  setMessage("Running backtest…");

  try {
    const updatedStrategy: Strategy = {
      ...strategy,
      regimes: regimes, // ✅ ensure latest regimes included
    };

    const result = await runBacktest(updatedStrategy);

    setMessage("✅ Backtest completed successfully");
    console.log("Backtest result:", result);

    if (onRunBacktest) {
      await onRunBacktest(updatedStrategy, regimes);
    }
  } catch (err) {
    console.error(err);
    setMessage("❌ Failed to start backtest");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="space-y-6">


      <div>
        <label className="block mb-1 font-medium">
          Regime Type:{" "}
          <span className="text-indigo-700 font-semibold">{regimeType}</span>
        </label>
      </div>

      {/* Regime Cards */}
      <div className="space-y-6">
        {regimes.map((r, i) => (
          <RegimeCard
            key={i}
            regime={r}
            onUpdate={(updated) => {
              const copy = [...regimes];
              copy[i] = updated;
              setRegimes(copy);
            }}
          />
        ))}
      </div>

      {/* Add Regime Button */}
      { (regimeType === "Simple" || regimeType === "Individual ETFs - Simple") && (
        <div className="pt-6 border-t">
          <button
            type="button"
            onClick={handleAddRegime}
            className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg shadow hover:bg-indigo-700"
          >
            + Add Regime
          </button>
        </div>
      )}
    
        {message && (
        <div className="p-3 rounded bg-gray-100 border border-gray-300">
          {message}
        </div>
      )}
      {/* Action Buttons */}
      <div className="pt-6 border-t">
        {firstInvalid && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <div className="font-semibold">
                Regime {firstInvalid.index + 1} is missing:
              </div>
              <ul className="mt-1 list-disc pl-5">
                {firstInvalid.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}


        <div className="flex justify-end gap-4">
          <button
            type="button"
            disabled={loading || !allValid}
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50"
          >
            {strategy.id ? "Update Strategy" : "Save Strategy"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleRunBacktest}
            className="px-5 py-2 bg-green-600 text-white text-sm rounded-lg shadow hover:bg-green-700 disabled:opacity-50"
          >
            ▶ Run Backtest
          </button>
        </div>
      </div>

    </div>
  );
};

export default MarketRegimeTab;


