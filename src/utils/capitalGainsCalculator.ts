import Decimal from 'decimal.js';
import type { CryptoTransaction } from '../types';

/**
 * Capital Gains Calculator
 * Implements FIFO (First In, First Out) method for cost base calculations
 * and applies 50% CGT discount for assets held > 12 months
 */

export interface CapitalGainEvent {
    sellTransaction: CryptoTransaction;
    assetName: string;
    sellDate: Date;
    sellQuantity: Decimal;
    saleProceeds: Decimal;
    costBase: Decimal;
    fees: Decimal;
    grossGain: Decimal;
    holdingPeriodDays: number;
    discountApplied: boolean;
    discountAmount: Decimal;
    taxableGain: Decimal;
    matchedBuys: MatchedBuy[];
}

export interface MatchedBuy {
    buyTransaction: CryptoTransaction;
    quantityUsed: Decimal;
    costBase: Decimal;
    holdingDays: number;
}

export interface CapitalGainsSummary {
    totalGains: Decimal;
    totalLosses: Decimal;
    netCapitalGain: Decimal;
    totalDiscountApplied: Decimal;
    taxableCapitalGain: Decimal;
    events: CapitalGainEvent[];
}

const DAYS_FOR_CGT_DISCOUNT = 365; // Must hold for more than 12 months
const CGT_DISCOUNT_RATE = new Decimal(0.5); // 50% discount

/**
 * Calculate capital gains using FIFO method
 */
export function calculateCapitalGains(transactions: CryptoTransaction[]): CapitalGainsSummary {
    // Sort transactions by date
    const sortedTxs = [...transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group by asset
    const assetGroups = new Map<string, CryptoTransaction[]>();
    for (const tx of sortedTxs) {
        const group = assetGroups.get(tx.assetName) || [];
        group.push(tx);
        assetGroups.set(tx.assetName, group);
    }

    const events: CapitalGainEvent[] = [];

    // Process each asset separately
    for (const [assetName, txs] of assetGroups) {
        const assetEvents = calculateAssetCapitalGains(assetName, txs);
        events.push(...assetEvents);
    }

    // Sort events by sell date
    events.sort((a, b) => a.sellDate.getTime() - b.sellDate.getTime());

    // Calculate summary
    let totalGains = new Decimal(0);
    let totalLosses = new Decimal(0);
    let totalDiscountApplied = new Decimal(0);
    let taxableCapitalGain = new Decimal(0);

    for (const event of events) {
        if (event.grossGain.greaterThan(0)) {
            totalGains = totalGains.plus(event.grossGain);
        } else {
            totalLosses = totalLosses.plus(event.grossGain.abs());
        }
        totalDiscountApplied = totalDiscountApplied.plus(event.discountAmount);
        taxableCapitalGain = taxableCapitalGain.plus(event.taxableGain);
    }

    return {
        totalGains,
        totalLosses,
        netCapitalGain: totalGains.minus(totalLosses),
        totalDiscountApplied,
        taxableCapitalGain,
        events,
    };
}

/**
 * Calculate capital gains for a single asset using FIFO
 */
function calculateAssetCapitalGains(assetName: string, transactions: CryptoTransaction[]): CapitalGainEvent[] {
    const events: CapitalGainEvent[] = [];

    // Maintain a queue of buy lots (FIFO)
    const buyLots: { tx: CryptoTransaction; remainingQty: Decimal }[] = [];

    for (const tx of transactions) {
        if (tx.type === 'buy') {
            // Add to buy lots queue
            buyLots.push({
                tx,
                remainingQty: new Decimal(tx.quantity),
            });
        } else if (tx.type === 'sell') {
            // Process sale using FIFO
            const event = processSale(assetName, tx, buyLots);
            if (event) {
                events.push(event);
            }
        }
    }

    return events;
}

/**
 * Process a sale transaction using FIFO matching
 */
function processSale(
    assetName: string,
    sellTx: CryptoTransaction,
    buyLots: { tx: CryptoTransaction; remainingQty: Decimal }[]
): CapitalGainEvent | null {
    const sellQty = new Decimal(sellTx.quantity);
    const sellPrice = new Decimal(sellTx.price);
    const sellFees = new Decimal(sellTx.fees || '0');
    const sellDate = new Date(sellTx.date);

    let remainingToSell = sellQty;
    let totalCostBase = new Decimal(0);
    let weightedHoldingDays = 0;
    const matchedBuys: MatchedBuy[] = [];

    // Match against buy lots using FIFO
    for (const lot of buyLots) {
        if (remainingToSell.lessThanOrEqualTo(0)) break;
        if (lot.remainingQty.lessThanOrEqualTo(0)) continue;

        const buyDate = new Date(lot.tx.date);
        const holdingDays = Math.floor((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate how much of this lot to use
        const qtyToUse = Decimal.min(lot.remainingQty, remainingToSell);

        // Calculate cost base for this portion (proportional)
        const buyPricePerUnit = new Decimal(lot.tx.price).div(new Decimal(lot.tx.quantity));
        const buyFeesPerUnit = new Decimal(lot.tx.fees || '0').div(new Decimal(lot.tx.quantity));
        const lotCostBase = qtyToUse.mul(buyPricePerUnit.plus(buyFeesPerUnit));

        totalCostBase = totalCostBase.plus(lotCostBase);
        weightedHoldingDays += qtyToUse.toNumber() * holdingDays;

        matchedBuys.push({
            buyTransaction: lot.tx,
            quantityUsed: qtyToUse,
            costBase: lotCostBase,
            holdingDays,
        });

        // Reduce lot remaining quantity
        lot.remainingQty = lot.remainingQty.minus(qtyToUse);
        remainingToSell = remainingToSell.minus(qtyToUse);
    }

    // If we couldn't match all quantity, we have missing buys (possible data issue)
    if (remainingToSell.greaterThan(0)) {
        console.warn(`Could not match all sell quantity for ${assetName}. Missing buy records.`);
    }

    // Calculate sale proceeds (net of fees)
    const saleProceeds = sellPrice.minus(sellFees);

    // Calculate gross gain/loss
    const grossGain = saleProceeds.minus(totalCostBase);

    // Calculate average holding period
    const avgHoldingDays = sellQty.toNumber() > 0
        ? Math.floor(weightedHoldingDays / sellQty.toNumber())
        : 0;

    // Check if eligible for CGT discount (held > 12 months and gain is positive)
    const discountApplied = avgHoldingDays > DAYS_FOR_CGT_DISCOUNT && grossGain.greaterThan(0);
    const discountAmount = discountApplied
        ? grossGain.mul(CGT_DISCOUNT_RATE)
        : new Decimal(0);

    // Taxable gain (after discount, or full loss if negative)
    const taxableGain = grossGain.greaterThan(0)
        ? grossGain.minus(discountAmount)
        : grossGain; // Losses are not discounted

    return {
        sellTransaction: sellTx,
        assetName,
        sellDate,
        sellQuantity: sellQty,
        saleProceeds,
        costBase: totalCostBase,
        fees: sellFees,
        grossGain,
        holdingPeriodDays: avgHoldingDays,
        discountApplied,
        discountAmount,
        taxableGain,
        matchedBuys,
    };
}

/**
 * Format a capital gain event for display
 */
export function formatCapitalGainEvent(event: CapitalGainEvent): string {
    const gainOrLoss = event.grossGain.greaterThanOrEqualTo(0) ? 'Gain' : 'Loss';
    const discountNote = event.discountApplied ? ' (50% discount applied)' : '';

    return `${event.assetName} ${gainOrLoss}: $${event.grossGain.toFixed(2)}${discountNote}`;
}

/**
 * Calculate unrealized gains for current holdings
 */
export function calculateUnrealizedGains(
    transactions: CryptoTransaction[],
    currentPrices: Map<string, Decimal>
): { asset: string; quantity: Decimal; costBase: Decimal; currentValue: Decimal; unrealizedGain: Decimal }[] {
    // Sort by date
    const sortedTxs = [...transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Track holdings per asset using FIFO
    const holdings = new Map<string, { qty: Decimal; costBase: Decimal }>();

    for (const tx of sortedTxs) {
        const current = holdings.get(tx.assetName) || { qty: new Decimal(0), costBase: new Decimal(0) };

        if (tx.type === 'buy') {
            const txCost = new Decimal(tx.price).plus(new Decimal(tx.fees || '0'));
            current.qty = current.qty.plus(new Decimal(tx.quantity));
            current.costBase = current.costBase.plus(txCost);
        } else {
            const sellQty = new Decimal(tx.quantity);
            const avgCostPerUnit = current.qty.greaterThan(0)
                ? current.costBase.div(current.qty)
                : new Decimal(0);
            const costReduction = sellQty.mul(avgCostPerUnit);

            current.qty = current.qty.minus(sellQty);
            current.costBase = Decimal.max(current.costBase.minus(costReduction), new Decimal(0));
        }

        holdings.set(tx.assetName, current);
    }

    // Calculate unrealized gains
    const results = [];
    for (const [asset, { qty, costBase }] of holdings) {
        if (qty.greaterThan(0)) {
            const currentPrice = currentPrices.get(asset) || new Decimal(0);
            const currentValue = qty.mul(currentPrice);
            const unrealizedGain = currentValue.minus(costBase);

            results.push({
                asset,
                quantity: qty,
                costBase,
                currentValue,
                unrealizedGain,
            });
        }
    }

    return results;
}
