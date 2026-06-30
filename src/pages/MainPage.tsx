import React from "react";
import { Link } from "react-router-dom";

// ── Nav card definitions ──────────────────────────────────────────────────────

const sections = [
  {
    id: "strategy",
    label: "Strategy",
    color: "emerald",
    items: [
      { to: "/strategies",  label: "Strategy dashboard", desc: "Manage and run backtests" },
      { to: "/indicators",  label: "Indicators",         desc: "Browse indicator registry"  },
    ],
  },
  {
    id: "analysis",
    label: "Analysis",
    color: "violet",
    items: [
      { to: "/compare", label: "System comparison", desc: "Cross-strategy equity & metrics" },
    ],
  },
  {
    id: "universe",
    label: "Universe",
    color: "sky",
    items: [
      { to: "/universe/exclusions", label: "Ticker exclusions", desc: "Manage tickers removed from all universes" },
    ],
  },
  {
    id: "execution",
    label: "Live execution",
    color: "indigo",
    items: [
      { to: "/execution/holdings",    label: "Holdings & tradelist",  desc: "Live positions and trade history"     },
      { to: "/execution/basket",      label: "Basket review",         desc: "Today's PROPOSED + substitute pool"   },
      { to: "/execution/run-log",     label: "EOD run history",       desc: "Nightly run status and retry"         },
      { to: "/execution/substitution",   label: "Morning substitution",  desc: "Upload sub CSV and generate XLSX"      },
       { to: "/execution/live-performance", label: "Live performance",      desc: "Equity, returns & substitution analysis" },
    ],
  },
];

const colorMap: Record<string, { border: string; dot: string; card: string; hover: string; label: string }> = {
  emerald: {
    border: "border-emerald-500",
    dot:    "bg-emerald-500",
    card:   "hover:border-emerald-400 hover:bg-emerald-50",
    hover:  "group-hover:text-emerald-700",
    label:  "text-emerald-600",
  },
  violet: {
    border: "border-violet-500",
    dot:    "bg-violet-500",
    card:   "hover:border-violet-400 hover:bg-violet-50",
    hover:  "group-hover:text-violet-700",
    label:  "text-violet-600",
  },
  sky: {
    border: "border-sky-500",
    dot:    "bg-sky-500",
    card:   "hover:border-sky-400 hover:bg-sky-50",
    hover:  "group-hover:text-sky-700",
    label:  "text-sky-600",
  },
  indigo: {
    border: "border-indigo-500",
    dot:    "bg-indigo-500",
    card:   "hover:border-indigo-400 hover:bg-indigo-50",
    hover:  "group-hover:text-indigo-700",
    label:  "text-indigo-600",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

const MainPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">
              Quantatative Ltd
            </p>
            <h1 className="text-2xl font-bold text-gray-900 leading-none">
              Trading Platform
            </h1>
          </div>
          <p className="text-xs text-gray-400 pb-1">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-10">
        {sections.map((section) => {
          const c = colorMap[section.color];
          return (
            <div key={section.id}>
              {/* Section header */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} />
                <h2 className={`text-xs font-bold tracking-widest uppercase ${c.label}`}>
                  {section.label}
                </h2>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`group relative flex flex-col justify-between
                      bg-white border border-gray-200 rounded-xl px-4 py-4
                      transition-all duration-150 shadow-sm
                      ${c.card}`}
                  >
                    <div>
                      <p className={`text-sm font-semibold text-gray-800 mb-1 ${c.hover} transition-colors`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-400 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <span className="text-gray-300 text-sm group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MainPage;