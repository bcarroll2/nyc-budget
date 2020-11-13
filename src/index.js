import css from './style.css';
import Chart from 'chart.js';

// Total Budgets of all three
const TOTAL_FEDERAL_BUDGET = 4790000000000;
const TOTAL_STATE_BUDGET = 177000000000;
const TOTAL_NYC_BUDGET = 95298823318;

// The percent (0.0 - 1.0) each makes up of the NYC budget
const FEDERAL_GRANT_PERCENT_OF_NYC_BUDGET = 0.10;
const STATE_GRANT_PERCENT_OF_NYC_BUDGET = 0.17;

const BUDGET_DATA_URL = '//budget.council.nyc/assets/data/summary.json';

class BudgetCalculator {
  constructor() {
    this.refs = {
      formContainer: document.querySelector('form-container'),
      federalIncomeTax: document.getElementById('federalIncomeTax'),
      stateIncomeTax: document.getElementById('stateIncomeTax'),
      localIncomeTax: document.getElementById('localIncomeTax'),
      calculateBtn: document.querySelector('.calculate-tax'),
      showAllAgenciesBtn: document.querySelector('.show-all-agencies'),
      showTopTenAgenciesBtn: document.querySelector('.show-top-ten-agencies'),
      totalTaxLabel: document.querySelector('.total-tax-label'),
      totalNYCBudgetLabel: document.querySelector('.total-nyc-budget-label'),
      header: document.querySelector('header'),
      tableContainer: document.querySelector('.table-container'),
      downArrowContainer: document.querySelector('.down-arrow-container'),
      chart: document.getElementById('chart'),
    }

    this.state = {}

    this.boundUpdateTax = this.updateTax.bind(this);
    this.boundShowAllAgencies = this.showAllAgencies.bind(this);
    this.boundShowTopTenAgencies = this.showTopTenAgencies.bind(this);
    this.bindListeners();
    this.fetchData();
  }

  getTotalTaxAmount() {
    const federalIncomeTax = window.parseInt(this.refs.federalIncomeTax.value);
    const stateIncomeTax = window.parseInt(this.refs.stateIncomeTax.value);
    const localIncomeTax = window.parseInt(this.refs.localIncomeTax.value);
    const {
      totalFederalGrant,
      totalStateGrant,
    } = this.state;

    // Equation is
    // ((Total Federal Grant / Total Federal Budget) * Federal Income Tax) +
    // ((Total State Grant / Total State Budget) * State Income Tax) + 
    // Local Income Tax
    return (
      window.parseFloat(
        ((totalFederalGrant / TOTAL_FEDERAL_BUDGET) * federalIncomeTax) + 
        ((totalStateGrant / TOTAL_STATE_BUDGET) * stateIncomeTax) + 
        localIncomeTax
      ).toFixed(2)
    );
  }

  updateTax() {
    this.refs.totalTaxLabel.innerHTML = this.getTotalTaxAmount();
    this.refs.downArrowContainer.classList.add('visible');
    this.makeTable(this.state.agencies);
  }

  updateNYCBudgetLabel() {
    this.refs.totalNYCBudgetLabel.innerHTML = `$${new Intl.NumberFormat('en-US').format(this.state.totalBudget)}`;
  }

  fetchData() {
    window.fetch(BUDGET_DATA_URL)
      .then((response) => {
        const res = response.clone();
        return res.json()
      })
      .then((data) => {
        const budgetData = data.reduce((acc, item) => {
          const agency = item.agency;
          const existingAgency = acc.agencies.find((agencyObj) => {
            return agencyObj.name === agency
          });

          if (existingAgency) {
            existingAgency.amount += item.amount;
          } else {
            acc.agencies.push({
              name: item.agency,
              amount: item.amount,
            });
          }
          acc.totalBudget += item.amount;
          return acc;
        }, {
          totalBudget: 0,
          agencies: [],
        })

        budgetData.agencies.sort((a, b) => {
          if (a.amount > b.amount) {
            return -1;
          } 
          if (a.amount < b.amount) {
            return 1;
          }
          return 0;
        });

        this.setState({
          totalBudget: budgetData.totalBudget,
          agencies: budgetData.agencies,
          topTenAgencies: this.getTopTenAgencies(budgetData.agencies),
          // The total amount of money given to NYC budget from Grants
          totalFederalGrant: FEDERAL_GRANT_PERCENT_OF_NYC_BUDGET * budgetData.totalBudget,
          totalStateGrant: STATE_GRANT_PERCENT_OF_NYC_BUDGET * budgetData.totalBudget,
        });
        
        this.topTenAgencies = this.getTopTenAgencies(this.state.agencies);
        console.log(this.state);
        this.updateNYCBudgetLabel();
        this.makeChart(this.state.agencies);
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
    if (!this.backgroundColors) {
      this.generateRandomColorsArray(data.length);
    }

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
            label: (tooltipItem, data) => {
              const label = data.labels[tooltipItem.index];
              const amount = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
              const formattedAmount = new Intl.NumberFormat('en-US').format(amount);
              const percent = window.parseFloat(amount / this.state.totalBudget * 100).toFixed(3)
              return `${label}: $${formattedAmount} (${percent}%)`;
            }
          }
        },
        legend: {
          display: false,
        },
      },
    });
  }

  getTopTenAgencies(data) {
    const topTenAgencies = data.slice(0, 10).map((agency) => agency);
    return topTenAgencies;
  }

  setState(nextState) {
    this.state = Object.assign({}, this.state, nextState);
  }

  makeTable(data) {
    const yourContribution = this.getTotalTaxAmount();
    this.refs.tableContainer.innerHTML = `
      <div class="table-header row">
        <span class="cell agency-name-label">Agency</span>
        <span class="cell amount-label">Amount</span>
        <span class="cell proportion-label">Percent of Budget</span>
        <span class="cell your-contribution-label">Your Contribution (of $${yourContribution})</span>
      </div>
      ${data.map((agency) => {
        const proportionOfBudget = agency.amount / this.state.totalBudget;
        return (
          `
          <div class="row">
            <span class="cell agency-name-label">${agency.name}</span>
            <span class="cell amount-label">$${new Intl.NumberFormat('en-US').format(agency.amount)}</span>
            <span class="cell proportion-label">${window.parseFloat(100 * proportionOfBudget).toFixed(3)}%</span>
            <span class="cell your-contribution-label">$${new Intl.NumberFormat('en-US').format(yourContribution * proportionOfBudget)}</span>
          </div>
          `
        );
      }).join('')}
    `;
  }

  showAllAgencies() {
    this.refs.showAllAgenciesBtn.classList.add('active');
    this.refs.showTopTenAgenciesBtn.classList.remove('active');
    this.updateChart(this.state.agencies);
    this.makeTable(this.state.agencies)
  }

  showTopTenAgencies() {
    this.refs.showTopTenAgenciesBtn.classList.add('active');
    this.refs.showAllAgenciesBtn.classList.remove('active');
    this.updateChart(this.topTenAgencies);
    this.makeTable(this.topTenAgencies)
  }

  bindListeners() {
    this.refs.calculateBtn.addEventListener('click', this.boundUpdateTax);
    this.refs.showAllAgenciesBtn.addEventListener('click', this.boundShowAllAgencies);
    this.refs.showTopTenAgenciesBtn.addEventListener('click', this.boundShowTopTenAgencies);
    this.refs.downArrowContainer.addEventListener('click', () => {
      const tableRect = this.refs.tableContainer.getBoundingClientRect();
      const headerRect = this.refs.header.getBoundingClientRect();
      window.scrollTo({
        top: window.pageYOffset + tableRect.top - headerRect.height,
        behavior: 'smooth',
      })
    })
  }

}


const budgetCalc = new BudgetCalculator();