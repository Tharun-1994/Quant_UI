// src/pages/OverviewTab.tsx
import React from "react";
import StrategyForm from "../pages/StrategyForm.tsx";
import { createStrategy, runInSample } from "../services/strategyService.ts";
import { Strategy } from "../model/Strategy.ts";

interface Props {
  mode:"new" | "edit";
  strategy?: Strategy | null;  // 👈 add this
  onNext: (saved: Strategy) => void;
}

const OverviewTab: React.FC<Props> = ({ mode, strategy, onNext }) => {

    console.log("OverviewTab strategy:", strategy); // Debugging line

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4 text-indigo-700 border-b pb-2">
        New Strategy Settings
      </h2>
    <StrategyForm
      mode={mode}
      initialValues={strategy || {}}
      onSubmit={async (values) => {
        await createStrategy(values);
      }}
      onNext={onNext}
    />

    </div>
  );
};

export default OverviewTab;
