// Trading Calculators Logic

document.addEventListener('DOMContentLoaded', () => {
    // 1. Position Size Calculator
    const calcPositionBtn = document.getElementById('calcPositionBtn');
    if (calcPositionBtn) {
        calcPositionBtn.addEventListener('click', calculatePositionSize);
    }

    // 2. Margin Calculator
    const calcMarginBtn = document.getElementById('calcMarginBtn');
    if (calcMarginBtn) {
        calcMarginBtn.addEventListener('click', calculateMargin);
    }

    // 3. Risk / Reward & Profit Calculator
    const calcRRBtn = document.getElementById('calcRRBtn');
    if (calcRRBtn) {
        calcRRBtn.addEventListener('click', calculateRiskReward);
    }
});

function calculatePositionSize() {
    const accBalance = parseFloat(document.getElementById('posAccBalance').value);
    const riskPct = parseFloat(document.getElementById('posRiskPct').value);
    const stopLossPips = parseFloat(document.getElementById('posStopLoss').value);
    const pairType = parseFloat(document.getElementById('posPairType').value); // pip value multiplier approx

    if (isNaN(accBalance) || isNaN(riskPct) || isNaN(stopLossPips) || isNaN(pairType)) {
        alert("Please enter valid numbers for all fields.");
        return;
    }

    // 1. Calculate Risk Amount ($)
    const riskAmount = accBalance * (riskPct / 100);

    // 2. Calculate Lot Size
    // For a standard pair (EURUSD), 1 standard lot = $10/pip.
    // So Lot Size = Risk Amount / (StopLossPips * 10) for standard pair.
    let pipValueStd = 10;

    // Quick approximation for lot size based on type selected
    let lotSize = 0;

    if (pairType === 10) {
        lotSize = riskAmount / (stopLossPips * 10);
    } else if (pairType === 1000) {
        lotSize = riskAmount / (stopLossPips * 8.5); // Approximation for JPY pairs currently
    } else if (pairType === 1) {
        lotSize = riskAmount / (stopLossPips * 1); // Indices / metals depending on contract size
    }

    // Update UI
    document.getElementById('posResultRisk').textContent = `$${riskAmount.toFixed(2)}`;
    document.getElementById('posResultLot').textContent = lotSize.toFixed(2);
}

function calculateMargin() {
    const leverage = parseFloat(document.getElementById('margLeverage').value);
    const lotSize = parseFloat(document.getElementById('margLotSize').value);
    const price = parseFloat(document.getElementById('margPrice').value);
    const contract = parseFloat(document.getElementById('margContract').value);

    if (isNaN(leverage) || isNaN(lotSize) || isNaN(price) || isNaN(contract)) {
        alert("Please enter valid numbers for all fields.");
        return;
    }

    // Margin = (Lot Size * Contract Size * Price) / Leverage
    const margin = (lotSize * contract * price) / leverage;

    document.getElementById('margResult').textContent = `$${margin.toFixed(2)}`;
}

function calculateRiskReward() {
    const entry = parseFloat(document.getElementById('rrEntry').value);
    const stopLoss = parseFloat(document.getElementById('rrStop').value);
    const target = parseFloat(document.getElementById('rrTarget').value);
    const lotSize = parseFloat(document.getElementById('rrLotSize').value);
    const pipValue = parseFloat(document.getElementById('rrPipValue').value);
    const type = document.getElementById('rrType').value;

    if (isNaN(entry) || isNaN(stopLoss) || isNaN(target) || isNaN(lotSize) || isNaN(pipValue)) {
        alert("Please enter valid numbers for all fields.");
        return;
    }

    let riskPrice = 0;
    let rewardPrice = 0;

    if (type === 'buy') {
        riskPrice = entry - stopLoss;
        rewardPrice = target - entry;
    } else {
        riskPrice = stopLoss - entry;
        rewardPrice = entry - target;
    }

    if (riskPrice <= 0 || rewardPrice <= 0) {
        document.getElementById('rrRatioText').textContent = "Invalid (Check prices)";
        return;
    }

    // Depending on the asset, pip calculation varies. Assuming forex format 0.0001 = 1 pip
    // Adjust logic to dynamic based on decimal length of entry
    let decLength = (entry.toString().split('.')[1] || []).length;
    let multiplier = 10000;
    if (decLength <= 3) multiplier = 100; // JPY pair likely

    const riskPips = riskPrice * multiplier;
    const rewardPips = rewardPrice * multiplier;

    const riskAmt = riskPips * (lotSize * pipValue);
    const rewardAmt = rewardPips * (lotSize * pipValue);

    const ratio = rewardAmt / riskAmt;

    document.getElementById('rrRiskPips').textContent = riskPips.toFixed(1);
    document.getElementById('rrTargetPips').textContent = rewardPips.toFixed(1);
    document.getElementById('rrRatioText').textContent = `1 : ${ratio.toFixed(2)}`;
    document.getElementById('rrLossAmt').textContent = `-$${riskAmt.toFixed(2)}`;
    document.getElementById('rrProfitAmt').textContent = `+$${rewardAmt.toFixed(2)}`;
}
