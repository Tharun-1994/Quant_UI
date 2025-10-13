import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import axios from "axios";
import { equityGraph } from "../services/strategyService.ts";

interface Props {
  strategyId: number;
}

const EquityTab: React.FC<Props> = ({ strategyId }) => {
  const [data, setData] = useState<any[]>([]);
  const [layout, setLayout] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
    equityGraph(strategyId)
        .then((res) => {
        setData(res.data);
        setLayout(res.layout);
        })
        .catch(() => setError("⚠️ Failed to load equity data"));
    }, [strategyId]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-2">Equity Graph</h2>
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <Plot data={data} layout={layout} style={{ width: "100%", height: "800px" }} />
      )}
    </div>
  );
};

export default EquityTab;
