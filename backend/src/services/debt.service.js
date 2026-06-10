/**
 * All amounts are integers in paisa. No floating point at any step.
 */

/**
 * Distributes totalPaisa among N members using the distributor's remainder method.
 * Guarantees sum of shares === totalPaisa exactly.
 */
function splitEqually(totalPaisa, memberIds) {
  const n = memberIds.length;
  const base = Math.floor(totalPaisa / n);
  const extra = totalPaisa % n;

  return memberIds.map((id, i) => ({
    userId: id,
    amountPaisa: i < extra ? base + 1 : base,
  }));
}

/**
 * Builds a net balance map from unsettled ExpenseSplit documents.
 * balance[userId] > 0 → they are owed money
 * balance[userId] < 0 → they owe money
 */
function computeBalances(splits) {
  const balance = {};

  for (const split of splits) {
    const debtor = split.owedByUserId.toString();
    const creditor = split.owedToUserId.toString();

    if (debtor === creditor) continue;

    balance[debtor] = (balance[debtor] || 0) - split.amountPaisa;
    balance[creditor] = (balance[creditor] || 0) + split.amountPaisa;
  }

  return balance;
}

/**
 * Min-cash-flow greedy simplification.
 * Returns minimal list of { from, to, amountPaisa } transactions.
 */
function simplifyDebts(balanceMap) {
  // Work on a mutable copy
  const bal = { ...balanceMap };
  const transactions = [];

  while (true) {
    let maxCreditor = null;
    let maxDebtor = null;

    for (const [uid, amount] of Object.entries(bal)) {
      if (maxCreditor === null || amount > bal[maxCreditor]) maxCreditor = uid;
      if (maxDebtor === null || amount < bal[maxDebtor]) maxDebtor = uid;
    }

    if (!maxCreditor || !maxDebtor || bal[maxCreditor] <= 0 || bal[maxDebtor] >= 0) break;

    const settle = Math.min(bal[maxCreditor], -bal[maxDebtor]);

    transactions.push({ from: maxDebtor, to: maxCreditor, amountPaisa: settle });

    bal[maxCreditor] -= settle;
    bal[maxDebtor] += settle;

    if (bal[maxCreditor] === 0) delete bal[maxCreditor];
    if (bal[maxDebtor] === 0) delete bal[maxDebtor];
  }

  return transactions;
}

module.exports = { splitEqually, computeBalances, simplifyDebts };
