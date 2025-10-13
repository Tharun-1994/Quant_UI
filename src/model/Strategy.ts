import { MarketRegime } from "./MarketRegime";



export interface Strategy {
  id: number;
  name: string;             // strategy_name in form
  created_at: string;       // ISO date

  // Timing & rebalance
  rebalance: string;
  start_date: string;
  end_date: string;



  // Min constraints
  min_quantity: number;
  min_price: number;

  // System details
  system_type: string;
  market_regime_type: string;

  regimes: MarketRegime[];
  
}
