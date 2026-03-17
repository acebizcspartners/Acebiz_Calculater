# Australian Tax Planning Calculator

A comprehensive web-based tax planning tool designed for Australian tax practitioners and clients to model income distribution across multiple entities and calculate tax obligations.

## Features

### Entity Management
- **Pre-configured Entities**: Individual 1, Individual 2, Company, and Trust
- **Add Custom Entities**: Create additional entities including partnerships, SMSFs, or additional beneficiaries
- **Entity Types Supported**:
  - Individual (with optional under-18 beneficiary designation)
  - Company (with Base Rate Entity 25% or Standard Rate 30% toggle)
  - Trust
  - Partnership
  - SMSF (Self-Managed Super Fund)

### Income & Deduction Categories
- Employment Income (salary, wages)
- Business/Trading Income
- Rental Property (positive or negative income/losses)
- Investment Income (dividends, interest, capital gains)
- Distribution from Trust
- Distribution from Partnership
- Custom rows with descriptions

### Tax Calculations
- **Individual Tax**: Progressive tax rates with Medicare Levy
- **Minor Beneficiaries (<18 years)**: Special tax treatment at 63% for unexcepted income
- **Company Tax**: Both Base Rate Entity (25%) and Standard Rate (30%)
- **Trust Tax**: Beneficiary distribution calculations
- **Partnership/SMSF**: Pass-through entity calculations

### Planning Features
- **Income Allocation**: Distribute income across entities with simple input fields
- **Real-time Calculations**: Tax updates automatically as you enter data
- **PAYG Tracking**: Enter PAYG installments paid to calculate net outflow or refund
- **Net Position Analysis**: Immediate view of net tax outflow or refund for each entity

### Reporting & Export
- **Summary Cards**: Quick overview of each entity's tax position
- **Excel Export**: Export entire planning scenario to Excel (.xlsx) format with formulas
- **Professional Formatting**: Currency formatting and ready-to-present layouts
- **Print-Friendly**: Print or export to PDF directly from browser

### Tax Rates Included
- **FY 2024-25 Australian Tax Rates**:
  - Individual: $0-$18,200 (0%), $18,200-$45,000 (19%), $45,000-$120,000 (32.5%), $120,000-$180,000 (37%), $180,000+ (45%)
  - Medicare Levy: 2% (threshold $180,000)
  - Company: 25% (Base Rate Entity) or 30% (Standard Rate)
  - Minors: 63% on unexcepted income above $417

- **FY 2025-26 Australian Tax Rates**: Same rates as FY 2024-25

## Getting Started

### Opening the Tool
1. Open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)
2. The tool will load with default entities: Individual 1, Individual 2, Company, and Trust

### Basic Workflow

#### Step 1: Select Tax Year
- Use the dropdown in the top-left to select between FY 2024-25 and FY 2025-26

#### Step 2: Set Up Entities (Optional)
- Default entities are pre-configured
- Click "+ Add Entity" to add custom entities
- For companies, choose between Base Rate Entity (25%) or Standard Rate (30%)
- For individuals, mark them as under 18 if applicable for special tax treatment
- Use "Delete" button to remove custom entities

#### Step 3: Add Income Rows
- Click "+ Add Income Row"
- Select the income/deduction type from the dropdown
- Add an optional description (e.g., "Sydney Rental Property")
- The row will appear in the main table

#### Step 4: Distribute Income
- Enter income amounts in each column for the corresponding entity
- Use positive values for income and negative values for losses/deductions
- Calculations update in real-time

#### Step 5: Enter PAYG Information
- In the "PAYG Installment Paid" row, enter the total PAYG withholding for each entity
- The tool automatically calculates net outflow or refund

#### Step 6: Review & Export
- Review the summary cards showing each entity's tax position
- Click "Export to Excel" to save the scenario for client presentation
- Use your browser's Print function for PDF export

## Understanding the Tax Calculations

### Individual Taxpayers (Adult)
- Taxable income is calculated progressively using ATO tax brackets
- Medicare Levy (2%) applies to incomes above $180,000
- Standard tax-free threshold: $18,200

### Individual Beneficiaries (Under 18 years)
- ⚠️ **Important**: Minors are taxed at 63% on unexcepted income above $417
- This includes unexcepted capital gains and distributions
- Excepted income (certain dividends, interest) may have different treatment
- The tool applies the 63% rate by default - consult with a tax advisor for specific situations

### Companies
- **Base Rate Entity (25%)**: Australian resident companies and specific entities
- **Standard Rate (30%)**: Non-resident companies or those not qualifying for base rate
- Apply the rate directly to taxable income
- No Medicare Levy applies

### Trusts
- The tool calculates at the top marginal rate (45%) for trustee income
- In practice, trusts distribute to beneficiaries who pay tax at their marginal rates
- Use the beneficiary entities (Individual 1, 2, or custom) to model actual distributions

### PAYG & Net Position
- **PAYG Installments**: Amount already withheld from the entity
- **Net Outflow**: Tax payable minus PAYG paid (red when positive)
- **Refund**: When PAYG exceeds tax payable (green when positive)

## Use Cases

### Example 1: Trust Distribution Planning
1. Add a trust and beneficiaries (Individuals)
2. Model trust income in the Trust entity row
3. Distribute the income to different beneficiaries to optimize tax
4. Compare total tax using different distribution scenarios
5. Export the optimal scenario

### Example 2: Company vs. Individual Income
1. Compare salary taken as company director's salary vs. company profit distribution
2. Model the income in both the Company and Individual entity
3. Calculate which structure minimizes total tax

### Example 3: Minor Beneficiary Planning
1. Create a minor beneficiary entity (mark as under 18)
2. Model reasonable distributions to the minor
3. View the 63% tax rate impact
4. Compare with distributions to adult beneficiaries

## Tips for Effective Tax Planning

1. **Comparison Scenarios**: Export multiple scenarios for comparison
2. **Negative Gearing**: Use negative values for losses (rental property losses, deductions)
3. **PAYG Tracking**: Keep PAYG installment amounts up-to-date for accurate net position
4. **Professional Review**: Always have a qualified tax advisor review your planning
5. **Excepted Income**: For minors, clarify with your advisor which income qualifies as "excepted"
6. **Updated Rates**: Verify tax rates with ATO website for the latest information

## Technical Details

### Files Included
- **index.html**: Main application interface
- **styles.css**: Responsive design and styling
- **app.js**: Core calculation engine and interactivity
- **taxRates.js**: ATO tax rates and helper functions
- **README.md**: This documentation

### Browser Requirements
- Modern JavaScript support (ES6)
- JavaScript enabled
- Recommended: Chrome, Firefox, Safari, Edge (latest versions)

### External Dependencies
- **SheetJS (XLSX)**: For Excel export functionality (loaded from CDN)

### Local Storage
- The tool does NOT currently save data to local storage
- All data is in-memory; refresh the page to clear
- Use Excel export to save your scenarios

## Important Disclaimer

⚠️ **Tax Planning Disclaimer**: This calculator is a planning tool only and should not be considered tax advice. The calculations are based on general ATO tax rates for the specified financial years. Individual circumstances vary, and many factors may affect your actual tax liability, including:

- Franking credits
- Capital gains (CGT)
- Deductions and expenses
- Offsets and rebates
- State-based levies
- Trusts and distributions complexity
- Minor beneficiary excepted income rules
- Company-specific entity qualifications

**Always consult with a qualified tax advisor or accountant before making tax planning decisions.**

## Updates & Modifications

To update tax rates:
1. Open `taxRates.js`
2. Modify the tax bracket values in the `TAX_RATES` object
3. Refresh the browser to see changes

To add new income categories:
1. Add option to `addIncomeModal` form in `index.html`
2. Update the `getIncomeTypeLabel()` function in `app.js`

## Support

For issues or feature requests, contact your ACEBIZ team or tax advisor.

---

**Version**: 1.0
**Last Updated**: October 2024
**Created for**: ACEBIZ Tax Planning
