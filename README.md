# 💸 Student Spending Habits — Analysis & Interactive Dashboard

Data Science Final Project — *National Taipei University of Technology (NTUT)*, Spring 2025.

This project analyses the spending habits of 1,000 university students using
**descriptive analysis**, **clustering**, **predictive modelling**, **statistical
hypothesis testing**, and **finance-specific analytics** — and presents everything
in an interactive web dashboard that runs entirely in the browser.

---

## 🔗 Live dashboard

🌐 **[https://student-spending-habits.vercel.app](https://student-spending-habits.vercel.app)** — deployed as a static site on Vercel (auto-redeploys on every push to `main`).

---

## 📂 Repository structure

| File | What it is |
|---|---|
| `index.html`, `app.js`, `style.css` | The interactive dashboard (vanilla JS + [Plotly.js](https://plotly.com/javascript/)) |
| `data.json` | Pre-computed data + model/clustering/test results that power the dashboard |
| `vercel.json` | Static-hosting config for Vercel |
| `student_spending_analysis.ipynb` | The full Jupyter notebook (all analysis, with outputs & figures) |
| `student_spending.csv` | The dataset (1,000 students, 17 columns) |
| `requirements.txt` | Python dependencies to run the notebook |

---

## 📊 The dataset

Source: [Kaggle — Student Spending Dataset](https://www.kaggle.com/datasets/sumanthnimmagadda/student-spending-dataset)
(1,000 rows). Columns:

- **Demographics:** `age`, `gender`, `year_in_school`, `major`
- **Income:** `monthly_income`, `financial_aid`, `tuition`
- **Spending (9):** `housing`, `food`, `transportation`, `books_supplies`,
  `entertainment`, `personal_care`, `technology`, `health_wellness`, `miscellaneous`
- **Behaviour:** `preferred_payment_method`

> ⚠️ **The dataset is synthetically generated** — the raw columns are statistically
> independent (max pairwise correlation ≈ 0.075). The project therefore engineers
> meaningful financial features (savings, expense ratio, financial-stress label) so
> that clustering and classification are meaningful, and is transparent about this
> limitation throughout.

---

## 🚀 Quick start

### 1) View the dashboard locally

Do **not** open `index.html` by double-clicking — browsers block `fetch()` of local
files. Serve the folder over HTTP instead:

```bash
# from the repo root
python -m http.server 8000
# then open http://localhost:8000
```

### 2) Run the analysis notebook

> On Windows the Microsoft Store Python may block scikit-learn (Smart App Control).
> Use Anaconda / a normal Python install if you hit a "DLL load failed" error.

```bash
pip install -r requirements.txt
jupyter lab          # then open student_spending_analysis.ipynb and "Run All"
```

The notebook auto-detects `student_spending.csv` in the repo root, so no path
editing is needed. Figures are written to a `figures/` folder.

### 3) Deploy the dashboard to Vercel

The dashboard is a pure static site, so deployment needs no build step.

**Vercel CLI**
```bash
npm i -g vercel
vercel          # preview URL
vercel --prod   # production URL
```

**Or via vercel.com:** *Add New → Project → import this repo →* Framework Preset
**Other**, Build Command empty, Output Directory empty → **Deploy**.

---

## 🧪 What's inside the analysis

The notebook (and dashboard) cover six areas:

1. **Descriptive** — distributions, average spending, savings, major × year breakdown
2. **Clustering** — K-means segments (*Frugal / Balanced / High spender*), compared
   against Agglomerative, Gaussian Mixture and DBSCAN; PCA & t-SNE views
3. **Predictive** — 5 classifiers (LogReg, RandomForest, GradientBoosting, SVM, KNN)
   predicting financial stress, with cross-validation, ROC curves, GridSearch & SHAP
4. **Hypothesis testing** — ANOVA / t-test / chi-square on demographics
5. **Financial analytics** — Financial Health Score, 50/30/20 rule, Gini/Lorenz
   inequality, and a what-if policy simulation
6. **Honesty check** — demonstrates that raw-feature prediction has no signal

---

## 📈 Key findings

- **70.5%** of students are in monthly **deficit** (expenses > income + aid).
- Spending is highly **equal** across students (Gini ≈ 0.08).
- Demographics do **not** drive spending (all hypothesis tests are null) —
  consistent with the synthetic nature of the data.
- The financial-stress classifier reaches **ROC-AUC ≈ 0.98** because the deficit
  boundary is learnable from spending vs income.
- **What-if:** a +30% income boost (or +300/month aid) cuts the deficit rate from
  70.5% to ~48%.

---

## 🛠️ Tech stack

Python · pandas · scikit-learn · scipy · SHAP · matplotlib · seaborn ·
Jupyter · Plotly.js · Vercel

## 👥 Authors

Sheri Viharika · Ferly Ibrahim · Ihsanul Azmi · Nathanael Tjahyadi
— NTUT, Data Science Principles with Applications on Educational Data (Spring 2025)
