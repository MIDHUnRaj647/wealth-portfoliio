/**
 * MI-AS Wealth - Local Portfolio Data File
 * 
 * This file resides directly on your disk in the project directory.
 * It is loaded automatically on startup.
 */

const PORTFOLIO_DATA = {
  "goldGrams": 0,
  "savings": 0,
  "fd": 0,
  "fds": [],
  "rds": [],
  "lic": [],
  "mutualFunds": [],
  "stocks": []
};

if (typeof window !== 'undefined') {
  window.PORTFOLIO_DATA = PORTFOLIO_DATA;
}
