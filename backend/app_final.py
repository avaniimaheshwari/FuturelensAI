from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "FutureLens AI Backend 🚀"}


# -------------------------------
# 🔥 FETCH REAL INFLATION
# -------------------------------
def get_inflation(country):
    try:
        url = f"https://api.tradingeconomics.com/inflation/country/{country}?c=guest:guest"
        res = requests.get(url, timeout=5)
        data = res.json()

        if isinstance(data, list) and len(data) > 0:
            return float(data[0]["LatestValue"])
    except:
        pass

    fallback = {
        "india": 5.5,
        "us": 3.2,
        "uk": 4.1,
        "japan": 2.3
    }

    return fallback.get(country, 5)


# -------------------------------
# 🔥 NEWS FETCH
# -------------------------------
def get_news(country):
    API_KEY = "9d3303406d6849acbea482579ca16f27"

    query_map = {
        "india": "india economy",
        "us": "us economy",
        "uk": "uk economy",
        "japan": "japan economy"
    }

    query = query_map.get(country, "global economy")

    try:
        url = f"https://newsapi.org/v2/everything?q={query}&apiKey={API_KEY}"
        res = requests.get(url, timeout=5)
        data = res.json()

        articles = []
        if "articles" in data:
            for a in data["articles"][:10]:
                articles.append(a["title"])

        return articles
    except:
        return []


# -------------------------------
# 🔥 CALCULATE
# -------------------------------
@app.get("/calculate")
def calculate(monthly_investment: float, years: int, scenario: str, country: str):

    inflation = get_inflation(country)

    # scenario adjustment
    if scenario == "sip":
        annual_rate = 12
    elif scenario == "fd":
        annual_rate = 6
    elif scenario == "crypto":
        annual_rate = 20

    yearly_data = []
    total = 0

    for y in range(1, years + 1):
        for _ in range(12):
            total = (total + monthly_investment) * (1 + annual_rate/100/12)
        yearly_data.append(round(total, 2))

    future_value = yearly_data[-1]

    real_value = future_value / ((1 + inflation/100) ** years)
    inflation_impact = future_value - real_value

    # 🔥 NEWS IMPACT
    news = get_news(country)

    sentiment = 0
    weights = {
        "recession": -3,
        "inflation": -2,
        "crisis": -3,
        "growth": 3,
        "boom": 3,
        "rally": 2
    }

    for title in news:
        t = title.lower()
        for word, w in weights.items():
            if word in t:
                sentiment += w

    sentiment_score = sentiment / len(news) if news else 0
    impact_factor = max(min(sentiment_score * 0.5, 3), -3)

    # 🔥 RECOMMENDATION
    if inflation > 6:
        recommendation = "High inflation → SIP recommended"
    elif scenario == "fd":
        recommendation = "FD is safe but low growth"
    elif scenario == "crypto":
        recommendation = "Crypto high risk high return"
    else:
        recommendation = "SIP is balanced long-term strategy"

    return {
        "future_value": round(future_value, 2),
        "real_value": round(real_value, 2),
        "inflation_rate": inflation,
        "inflation_loss": round(inflation_impact, 2),
        "yearly_data": yearly_data,
        "recommendation": recommendation,
        "news_impact": impact_factor,
        "sentiment_score": sentiment_score,
        "news":news[:5]
    }


# -------------------------------
# 🔥 COMPARE + STRATEGY
# -------------------------------
@app.get("/compare")
def compare(monthly_investment: float, years: int, country: str):

    inflation = get_inflation(country)

    scenarios = {
        "sip": 12,
        "fd": 6,
        "crypto": 20
    }

    result = {}
    months = years * 12

    for name, rate in scenarios.items():
        value = 0
        yearly = []

        for i in range(months):
            value = (value + monthly_investment) * (1 + (rate - inflation)/100/12)

            if (i + 1) % 12 == 0:
                yearly.append(round(value, 2))

        result[name] = yearly

    # 🔥 BEST STRATEGY
    final_vals = {k: v[-1] for k, v in result.items()}
    best = max(final_vals, key=final_vals.get)

    # 🔥 SCENARIO SIMULATION
    def simulate(mod):
        sim = {}

        for name, rate in scenarios.items():

        # 🧠 Smart realistic adjustment
           adjusted_rate = rate + mod

           if name == "crypto":
            # high reward but risky
             adjusted_rate += (mod * 1.5)
             adjusted_rate -= 8   # volatility penalty

           elif name == "sip":
            # balanced
             adjusted_rate += (mod * 0.5)

           elif name == "fd":
            # safe asset
             adjusted_rate -= inflation * 0.3

           monthly_rate = (adjusted_rate - inflation) / 100 / 12

           value = 0
           for _ in range(months):
              value = (value + monthly_investment) * (1 + monthly_rate)

           sim[name] = value

        # return best performer
     
        return max(sim, key=sim.get)

    scenario_analysis = {
        "recession": simulate(-5),
        "normal": simulate(0),
        "boom": simulate(8)
    }

    return {
        "sip": result["sip"],
        "fd": result["fd"],
        "crypto": result["crypto"],
        "best_strategy": best,
        "scenario_analysis": scenario_analysis
    }