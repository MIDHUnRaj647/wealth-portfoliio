/**
 * MI-AS Wealth - Local Portfolio Data File
 * Auto-saved: 2026-10-24T17:56:09.088Z
 */

const PORTFOLIO_DATA = {
  "goldGrams": 0,
  "savings": 0,
  "fd": 50000,
  "fds": [
    {
      "bank": "Society",
      "amount": 50000,
      "dueDate": "2027-02-02",
      "lastAlertSent": "2026-10-24T16:26:31.312Z"
    }
  ],
  "lic": [
    {
      "name": "Lic Murali",
      "policyNo": "317578046",
      "premium": 2895,
      "sumAssured": 500000,
      "dueDate": "2040-02-07",
      "lastAlertSent": "2026-10-24T16:44:41.596Z"
    },
    {
      "name": "Lic Devi",
      "policyNo": "317235295",
      "premium": 5194,
      "sumAssured": 300000,
      "dueDate": "2036-08-08",
      "lastAlertSent": "2026-10-24T16:46:44.349Z"
    }
  ],
  "mutualFunds": [
    {
      "name": "HDFC Large & Mid Cap Fund - Direct Plan - Growth Option",
      "units": 69.423,
      "latestNav": 337.311,
      "code": "130498",
      "sipAmount": 5000,
      "sipDate": "2026-11-10",
      "lastSipAlertSent": "2026-10-24T16:29:48.921Z"
    },
    {
      "name": "Nippon India Small Cap Fund - Direct Plan - Growth Option",
      "units": 7.207,
      "latestNav": 189.2104,
      "code": "118778",
      "sipAmount": 500,
      "sipDate": "2026-11-06",
      "lastSipAlertSent": "2026-10-24T16:31:46.146Z"
    },
    {
      "name": "Axis Midcap Fund - Direct Plan - Growth Option",
      "units": 21.125,
      "latestNav": 131.67,
      "code": "120505",
      "sipAmount": 1000,
      "sipDate": "2026-11-03",
      "lastSipAlertSent": "2026-10-24T16:33:04.722Z"
    },
    {
      "name": "HDFC Flexi Cap Fund - Direct Plan - Growth Option",
      "units": 0.682,
      "latestNav": 2121.91,
      "code": "118955",
      "sipAmount": 50,
      "sipDate": "2026-10-26",
      "lastSipAlertSent": "2026-10-24T16:34:32.605Z"
    }
  ],
  "stocks": [],
  "rds": [
    {
      "bank": "Green Power RD",
      "monthlyAmount": 1000,
      "balance": 12000,
      "dueDate": "2026-11-02",
      "lastAlertSent": "2026-10-24T17:01:35.844Z"
    },
    {
      "bank": "RD PO Nikhilesh",
      "monthlyAmount": 500,
      "balance": 7500,
      "dueDate": "2026-11-03",
      "lastAlertSent": "2026-10-24T17:03:33.422Z"
    },
    {
      "bank": "RD Vasantha",
      "monthlyAmount": 500,
      "balance": 4000,
      "dueDate": "2026-11-02",
      "lastAlertSent": "2026-10-24T17:04:19.493Z"
    }
  ]
};

if (typeof window !== 'undefined') {
  window.PORTFOLIO_DATA = PORTFOLIO_DATA;
}
