import Decimal from 'decimal.js';
import type { WorkDeductions, DepreciableAsset, CryptoTransaction } from '../types';

// ==================== WFH Calculator ====================

export function calculateWorkDeduction(record: WorkDeductions): Decimal {
    if (record.wfhMethod === 'fixed_rate') {
        // 67 cents per hour
        return new Decimal(record.totalHoursWorked || 0).mul(0.67);
    } else {
        // Actual costs - sum all string values
        const costs = Object.values(record.actualCosts);
        return costs.reduce((sum, cost) => {
            return sum.add(new Decimal(cost || 0));
        }, new Decimal(0));
    }
}

// ==================== Depreciation Calculator ====================

export function calculateDepreciation(asset: DepreciableAsset, financialYearEnd: Date): Decimal {
    const cost = new Decimal(asset.cost || 0);
    const workUse = new Decimal(asset.workUsePercentage || 0).div(100);
    const life = new Decimal(asset.effectiveLifeYears || 1);

    // Days held in this financial year
    // Start date is later of: Purchase Date OR Start of FY (July 1)
    // End date is earlier of: Sold Date (not implemented yet) OR End of FY

    const fyStart = new Date(financialYearEnd);
    fyStart.setFullYear(fyStart.getFullYear() - 1);
    fyStart.setDate(fyStart.getDate() + 1); // July 1

    const startDate = asset.purchaseDate > fyStart ? asset.purchaseDate : fyStart;
    const endDate = financialYearEnd;

    // If bought after FY end (shouldn't happen for current year calc) or sold before start...
    if (startDate > endDate) return new Decimal(0);

    const oneDay = 24 * 60 * 60 * 1000;
    const daysHeld = Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneDay)) + 1; // Inclusive
    const daysInYear = 365; // Simplify leap year logic for now or check fyStart

    // Pro-rata factor
    const proRata = new Decimal(daysHeld).div(daysInYear);

    let deduction = new Decimal(0);

    if (asset.method === 'prime_cost') {
        // Prime Cost: Cost * (100% / Life) * ProRata
        const rate = new Decimal(1).div(life);
        deduction = cost.mul(rate).mul(proRata);
    } else {
        // Diminishing Value: BaseValue * (200% / Life) * ProRata
        // Note: BaseValue should decrease each year. 
        // For simplicity in this "snapshot" app without full multi-year history state:
        // We assume it's the first year deduction OR we imply a generic calc.
        // *Correction*: To do this right without previous year data, we approximate or assume Purchase in current year?
        // If purchaseDate is in previous years, we need Opening Value.
        // We don't have Opening Value in DB.
        // Fallback: Calculate as if first year for newly added assets, or warn.
        // Implementation: We'll stick to Cost basis for now but this is an inaccuracy to note.
        // Standard formula: Cost * (2 / Life) * ProRata

        const rate = new Decimal(2).div(life);
        deduction = cost.mul(rate).mul(proRata);
    }

    return deduction.mul(workUse);
}

// ==================== CGT Calculator (FIFO) ====================

interface InventoryBatch {
    price: Decimal; // Price per unit
    quantity: Decimal;
    date: Date;
    costBase: Decimal; // Total cost for this batch
}

export function calculateCapitalGains(transactions: CryptoTransaction[]): Decimal {
    // Sort by date ascending
    const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

    const inventory: InventoryBatch[] = [];
    let totalNetGain = new Decimal(0);
    let totalCapitalLoss = new Decimal(0); // Can only offset gains

    for (const tx of sorted) {
        const price = new Decimal(tx.price || 0);
        const quantity = new Decimal(tx.quantity || 1);

        if (tx.type === 'buy') {
            const pricePerUnit = price.div(quantity);
            inventory.push({
                price: pricePerUnit,
                quantity: quantity,
                date: tx.date,
                costBase: price
            });
        } else if (tx.type === 'sell') {
            let remainingSellQty = quantity;
            let totalCostBase = new Decimal(0);

            // Consume inventory (FIFO)
            while (remainingSellQty.gt(0) && inventory.length > 0) {
                const batch = inventory[0];

                const takeQty = Decimal.min(batch.quantity, remainingSellQty);
                const batchCost = batch.price.mul(takeQty);

                totalCostBase = totalCostBase.add(batchCost);

                // Check 12 month rule for this batch
                // If any batch used is < 12 months, we separate them? 
                // Simplified: Calculate gain per batch segment

                const proceedPortion = price.mul(takeQty).div(quantity); // Pro-rata proceeds
                const grossGain = proceedPortion.sub(batchCost);

                const heldDuration = tx.date.getTime() - batch.date.getTime();
                const isLongTerm = heldDuration >= (365 * 24 * 60 * 60 * 1000);

                if (grossGain.gt(0)) {
                    if (isLongTerm) {
                        totalNetGain = totalNetGain.add(grossGain.mul(0.5)); // 50% discount
                    } else {
                        totalNetGain = totalNetGain.add(grossGain);
                    }
                } else {
                    // Loss
                    totalCapitalLoss = totalCapitalLoss.add(grossGain.abs());
                }

                // Update batch
                batch.quantity = batch.quantity.sub(takeQty);
                if (batch.quantity.lte(0)) {
                    inventory.shift();
                }

                remainingSellQty = remainingSellQty.sub(takeQty);
            }

            // If we sold more than we have (error state or missing history), ignore excess?
        }
    }

    // Apply losses to gains
    const finalGain = totalNetGain.sub(totalCapitalLoss);
    return Decimal.max(finalGain, 0);
}
