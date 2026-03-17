# Capital Gains Calculator - Documentation

## Overview
A comprehensive web-based calculator for Australian capital gains tax (CGT) calculations on shares, securities, and funds. The calculator implements the Australian Taxation Office (ATO) rules for correctly applying capital losses and CGT discount.

## Features

### Core Functionality
- **FIFO/LIFO Support**: Calculate capital gains using First-In-First-Out or Last-In-First-Out methods
- **CGT Discount**: Automatic 50% discount for assets held longer than 12 months
- **Multi-Currency Support**: Handles USD and AUD transactions with exchange rate conversion
- **Dividend Reinvestment**: Optional support for dividend reinvestment plans (DRP)
- **Batch Processing**: Process multiple transactions across multiple securities
- **Financial Year Selection**: Calculate for specific Australian financial years (July 1 - June 30)

### ATO Compliance
The calculator follows the ATO's official method for capital gains calculation:

1. **First**: Apply capital losses to reduce capital gains
2. **Second**: Losses are applied to non-discountable gains (held <12 months) first
3. **Third**: Remaining losses are applied to discountable gains (held >12 months)
4. **Finally**: Apply 50% CGT discount to any remaining discountable gains

This ensures optimal tax outcomes by reducing non-discountable gains before discountable ones.

## Input File Format

### Transaction Data (Excel)
Required columns:
- **Date/Transaction Date**: Date of transaction
- **Shares/Security/Symbol**: Security identifier
- **Side/Type**: "Buy" or "Sell"
- **Amount/Quantity**: Number of shares
- **Total/Amount**: Total transaction value
- **Fee Amount/Fees**: Transaction fees (optional)
- **Currency/CCY**: Transaction currency (AUD/USD)
- **Exchange Rate**: AUD/USD rate for USD transactions

### Dividend Reinvestment Data (Excel)
Required columns:
- **Payment Date/Date**: Date of dividend payment
- **Symbol/Stock/Security**: Security identifier
- **Net Amount/Amount**: Dividend amount
- **Currency/CCY**: Currency (AUD/USD)
- **Exchange Rate**: For USD dividends

## Output Summary

### Main Dashboard
- **Gross Capital Gains**: Total gains before any adjustments
- **Taxable Capital Gains**: Gains after applying CGT discount
- **Total Capital Losses**: Sum of all capital losses
- **Net Taxable Gain/Loss**: Final amount for tax return
- **CGT Discount Applied**: Total discount amount
- **Transactions Processed**: Number of transactions

### Australian Tax Return Summary
Detailed breakdown showing:
- Total capital gains by type (discountable/non-discountable)
- Capital losses and their application
- Net gains after losses (before discount)
- CGT discount calculation
- Final net capital gain/loss for tax return

### Transaction Details Table
For each sale transaction:
- Security name
- Buy and sell dates
- Days held and eligibility for CGT discount
- Quantity and prices (with currency conversion if applicable)
- Gross gain/loss
- CGT discount eligibility
- Calculation method used

## Excel Export
The calculator exports a comprehensive Excel workbook with three tabs:

1. **Summary**: Overall CGT calculation summary
2. **Detailed Calculations**: Transaction-by-transaction breakdown
3. **Issues & Errors**: Any processing errors or warnings

## Usage Instructions

### Basic Setup
1. Open the calculator at http://localhost:8000
2. Upload your transaction data Excel file
3. Optionally upload dividend reinvestment data
4. Select the financial year
5. Choose calculation method (FIFO/LIFO)
6. Enable/disable CGT discount
7. Click "Calculate Capital Gains"

### Best Practices
- Ensure all USD transactions include exchange rates
- Include all buy transactions before the sell date
- Use consistent security names/symbols
- Review the Issues & Errors section for any warnings

## Technical Implementation

### Calculation Logic
```javascript
// Correct ATO order of operations:
1. Separate gains into discountable (>12 months) and non-discountable (<12 months)
2. Apply losses to non-discountable gains first
3. Apply remaining losses to discountable gains
4. Apply 50% CGT discount to remaining discountable gains
5. Calculate final net capital gain/loss
```

### Key Algorithms
- **FIFO Method**: Matches sells with oldest buy transactions first
- **LIFO Method**: Matches sells with newest buy transactions first
- **Partial Sales**: Handles partial lot sales with proportional cost basis allocation
- **Fee Allocation**: Proportionally allocates sell fees across partial sales

## Error Handling

Common errors and solutions:
- **Missing exchange rate**: Add "Exchange Rate" column for USD transactions
- **No holdings found**: Ensure buy transactions exist before sells
- **Insufficient holdings**: Check quantities match between buys and sells

## Compliance Notes

- Follows Australian Taxation Office (ATO) guidelines
- Implements correct order for loss application and CGT discount
- Suitable for individual tax returns (consult tax professional for complex scenarios)
- Capital losses can be carried forward if not fully utilized

## File Structure
```
.claude/Capital Gains/
├── index.html              # Main calculator application
├── README.md              # This documentation
├── Upload Data.xlsx       # Transaction template
├── Dividend Reinvestment Format.xlsx  # Dividend template
├── Sample Data.xlsx       # Example data file
└── Uploaded Data/         # User data directory
```

## Updates and Maintenance

### Recent Updates
- Implemented correct ATO method for applying losses before CGT discount
- Added support for applying losses to non-discountable gains first
- Enhanced summary display with detailed calculation breakdown
- Improved Excel export with comprehensive reporting

### Future Enhancements
- Support for additional asset types
- Integration with brokerage APIs
- Multi-year capital loss tracking
- Tax optimization suggestions

## Disclaimer
This calculator is provided for informational purposes only. Users should consult with a qualified tax professional for specific tax advice. The calculator implements general ATO rules but may not cover all special circumstances or complex scenarios.

## Support
For issues or questions about the calculator:
- Review error messages in the Issues & Errors section
- Check that input data matches the required format
- Ensure all required columns are present in Excel files
- Verify exchange rates for foreign currency transactions

---
*Last Updated: October 2025*
*Version: 1.0.0*