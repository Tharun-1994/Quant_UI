// src/model/GlobalFilter.ts

import { Rule } from "./MarketRegime";


export interface GlobalFilter {
  /** 
   * A list of conditions (indicator/operator/value) 
   * that must evaluate to true for this filter to activate.
   */
  condition: Rule[];

  /**
   * Defines the system-level action when condition is true.
   * e.g., CLOSE_ALL_TRADES, BLOCK_NEW_ENTRIES
   */
  action: string;
}
