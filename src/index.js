import css from './style.css';
import Chart from 'chart.js';

// Total Budgets of all three
const TOTAL_FEDERAL_BUDGET = 4790000000000;
const TOTAL_STATE_BUDGET = 177000000000;
const TOTAL_NYC_BUDGET = 95298823318;

// The percent (0.0 - 1.0) each makes up of the NYC budget
const FEDERAL_GRANT_PERCENT_OF_NYC_BUDGET = 0.10;
const STATE_GRANT_PERCENT_OF_NYC_BUDGET = 0.17;

// The total amount of money given to NYC budget from Grants
const TOTAL_FEDERAL_GRANT = FEDERAL_GRANT_PERCENT_OF_NYC_BUDGET * TOTAL_NYC_BUDGET;
const TOTAL_STATE_GRANT = STATE_GRANT_PERCENT_OF_NYC_BUDGET * TOTAL_NYC_BUDGET;

class BudgetCalculator {
  constructor() {
    this.refs = {
      formContainer: document.querySelector('form-container'),
      federalIncomeTax: document.getElementById('federalIncomeTax'),
      stateIncomeTax: document.getElementById('stateIncomeTax'),
      localIncomeTax: document.getElementById('localIncomeTax'),
      calculateBtn: document.querySelector('.calculate-tax'),
      shopAllAgenciesBtn: document.querySelector('.show-all-agencies'),
      showTopTenAgenciesBtn: document.querySelector('.show-top-ten-agencies'),
      totalTaxLabel: document.querySelector('.total-tax-label'),
      totalNYCBudgetLabel: document.querySelector('.total-nyc-budget-label'),
      tableContainer: document.querySelector('.table-container'),
      chart: document.getElementById('chart'),
    }

    this.boundUpdateTax = this.updateTax.bind(this);
    this.boundShowAllAgencies = this.showAllAgencies.bind(this);
    this.boundShowTopTenAgencies = this.showTopTenAgencies.bind(this);
    this.updateNYCBudgetLabel();
    this.bindListeners();
    this.fetchData();
  }

  getTotalTaxAmount() {
    const federalIncomeTax = window.parseInt(this.refs.federalIncomeTax.value);
    const stateIncomeTax = window.parseInt(this.refs.stateIncomeTax.value);
    const localIncomeTax = window.parseInt(this.refs.localIncomeTax.value);

    // Equation is
    // ((Total Federal Grant / Total Federal Budget) * Federal Income Tax) +
    // ((Total State Grant / Total State Budget) * State Income Tax) + 
    // Local Income Tax

    return (
      window.parseFloat(((TOTAL_FEDERAL_GRANT / TOTAL_FEDERAL_BUDGET) * federalIncomeTax) + 
      ((TOTAL_STATE_GRANT / TOTAL_STATE_BUDGET) * stateIncomeTax) + 
      localIncomeTax).toFixed(2)
    );
  }

  updateTax() {
    this.refs.totalTaxLabel.innerHTML = this.getTotalTaxAmount();
    this.makeTable(this.departmentData.agencies);
  }

  updateNYCBudgetLabel() {
    this.refs.totalNYCBudgetLabel.innerHTML = new Intl.NumberFormat('en-US').format(TOTAL_NYC_BUDGET);
  }

  fetchData() {
    window.fetch('http://budget.council.nyc/assets/data/summary.json')
      .then((response) => {
        const res = response.clone();
        return res.json()
      })
      .then((data) => {
        this.departmentData = data.reduce((acc, item) => {
          const agency = item.agency;
          const existingAgency = acc.agencies.find((agencyObj) => {
            return agencyObj.name === agency
          });

          if (existingAgency) {
            existingAgency.amount += item.amount;
            existingAgency.proportionOfBudget = existingAgency.amount / TOTAL_NYC_BUDGET;
          } else {
            acc.agencies.push({
              name: item.agency,
              amount: item.amount,
              proportionOfBudget: item.amount / TOTAL_NYC_BUDGET,
            });
          }
          acc.totalBudget += item.amount;
          return acc;
        }, {
          totalBudget: 0,
          agencies: [],
        })

        this.departmentData.agencies.sort((a, b) => {
          if (a.amount > b.amount) {
            return -1;
          } 
          if (a.amount < b.amount) {
            return 1;
          }
          return 0;
        });

        this.topTenAgencies = this.getTopTenAgencies(this.departmentData.agencies);
        
        console.log(this.departmentData.agencies);
        this.makeChart(this.departmentData.agencies);
      });
  }

  generateRandomColorsArray(amount) {
    const backgroundColorsArr = [];
    for (let i = 0; i < amount; i++) {
      const randomRed = Math.floor(Math.random() * 256);
      const randomGreen = Math.floor(Math.random() * 256);
      const randomBlue = Math.floor(Math.random() * 256);
      const randomBackgroundColor = `rgba(${randomRed}, ${randomGreen}, ${randomBlue}, 0.2)`;
      backgroundColorsArr.push(randomBackgroundColor);
    }
    this.backgroundColors = backgroundColorsArr;
  }

  updateChart(data) {
    this.pieChart.destroy()
    this.makeChart(data);
  }

  makeChart(data) {
    this.generateRandomColorsArray(data.length);
    
    this.pieChart = new Chart(this.refs.chart, {
      type: 'doughnut',
      data: {
        labels: data.map((item) => item.name),
        datasets: [{
          data: data.map((item) => item.amount),
          backgroundColor: this.backgroundColors,
          hoverBorderColor: 'rgba(0, 0, 0, 1)',
          borderWidth: 1,
          borderAlign: 'inner',
        }],
      },
      options: {
        tooltips: {
          callbacks: {
            label: function(tooltipItem, data) {
              const label = data.labels[tooltipItem.index];
              const amount = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
              const formattedAmount = new Intl.NumberFormat('en-US').format(amount);
              return `${label}: $${formattedAmount}`;
            }
          }
        },
        legend: {
          display: false,
        },
      }
    });
  }

  getTopTenAgencies(data) {
    const topTenAgencies = data.slice(0, 10).map((agency) => agency);
    return topTenAgencies;
  }

  makeTable(data) {
    const yourContribution = this.getTotalTaxAmount();
    this.refs.tableContainer.innerHTML = `
      <div class="table-header row">
        <span class="cell agency-name-label">Agency Name</span>
        <span class="cell amount-label">Agency Amount</span>
        <span class="cell proportion-label">Percent of Budget</span>
        <span class="cell your-contribution-label">Your Contribution (of $${yourContribution})</span>
      </div>
      ${data.map((agency) => {
        return (
          `
          <div class="row">
            <span class="cell agency-name-label">${agency.name}</span>
            <span class="cell amount-label">$${new Intl.NumberFormat('en-US').format(agency.amount)}</span>
            <span class="cell proportion-label">${window.parseFloat(100 * agency.proportionOfBudget).toFixed(2)}%</span>
            <span class="cell your-contribution-label">$${new Intl.NumberFormat('en-US').format(yourContribution * agency.proportionOfBudget)}</span>
          </div>
          `
        );
      }).join('')}
    `
  }

  showAllAgencies() {
    this.updateChart(this.departmentData.agencies);
    this.makeTable(this.departmentData.agencies)
  }

  showTopTenAgencies() {
    this.updateChart(this.topTenAgencies);
    this.makeTable(this.topTenAgencies)
  }

  bindListeners() {
    this.refs.calculateBtn.addEventListener('click', this.boundUpdateTax);
    this.refs.shopAllAgenciesBtn.addEventListener('click', this.boundShowAllAgencies);
    this.refs.showTopTenAgenciesBtn.addEventListener('click', this.boundShowTopTenAgencies);
  }

}


const budgetCalc = new BudgetCalculator();