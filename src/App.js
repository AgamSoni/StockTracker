import React, { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "./components/ui/Card";
import { Button } from "./components/ui/Button";
import axios from "axios";

const fetchFromYahooFinance = async (stockSymbol) => {
  try {
    const response = await axios.get(
      `/yahoo-finance-api/v8/finance/chart/${stockSymbol}?range=1mo&interval=1d`
    );
    const result = response.data.chart.result[0];
    if (!result || !result.timestamp) {
      throw new Error("Invalid data structure from Yahoo Finance");
    }
    return result.timestamp.map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().split("T")[0],
      symbol: stockSymbol,
      close: result.indicators.quote[0].close[index],
    }));
  } catch (error) {
    console.error("Yahoo Finance error", error);
    return null;
  }
};

const fetchFromAlphaVantage = async (stockSymbol, range, apiKey) => {
  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=${range}&symbol=${stockSymbol}&apikey=${apiKey}`
    );
    const timeSeries = response.data["Time Series (Daily)"] || response.data["Time Series (Weekly)"] || response.data["Time Series (Monthly)"];
    if (!timeSeries) throw new Error("No data from Alpha Vantage");
    return Object.keys(timeSeries).map((date) => ({
      date,
      symbol: stockSymbol,
      close: parseFloat(timeSeries[date]["4. close"]),
    }));
  } catch (error) {
    console.error("Alpha Vantage error", error);
    // If Alpha Vantage fails, return null to signal fallback
    return null;
  }
};

const StockTrendApp = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState("AAPL");
  const [symbols, setSymbols] = useState(["AAPL", "TSLA"]);
  const [range, setRange] = useState("TIME_SERIES_DAILY");
  const API_KEY = "ELJ8TOLQ8C9ZI2PN";

  // Memoize fetchStockData function to avoid unnecessary re-renders
  const fetchStockData = useCallback(async (stockSymbols) => {
    setLoading(true);
    try {
      const fetchedData = await Promise.all(
        stockSymbols.map(async (stockSymbol) => {
          // First, try fetching data from Yahoo Finance
          let stockData = await fetchFromYahooFinance(stockSymbol);

          // If Yahoo Finance fails, fallback to Alpha Vantage
          if (!stockData) {
            console.warn(`Yahoo Finance error for ${stockSymbol}. Falling back to Alpha Vantage.`);
            stockData = await fetchFromAlphaVantage(stockSymbol, range, API_KEY);
          }

          // If Alpha Vantage also fails, log a message and return an empty array
          if (!stockData) {
            console.error(`Failed to fetch data for ${stockSymbol} from both Yahoo Finance and Alpha Vantage.`);
            return [];
          }

          console.log(`Fetched data for ${stockSymbol}:`, stockData); // Log the fetched data
          return stockData || [];
        })
      );
      
      // Sort data so that it's in ascending order (oldest date on the left)
      const sortedData = fetchedData.flat().sort((a, b) => new Date(a.date) - new Date(b.date));
      setData(sortedData); // Set the sorted data
      console.log("Updated chart data:", sortedData); // Log updated sorted data
    } catch (error) {
      console.error("Error fetching stock data", error);
    }
    setLoading(false);
  }, [range]); // Add range as a dependency for fetchStockData

  // Effect to fetch stock data when symbols or range changes
  useEffect(() => {
    fetchStockData(symbols);
  }, [symbols, fetchStockData]); // Only need symbols and memoized fetchStockData here

  const handleRemoveSymbol = (symbolToRemove) => {
    setSymbols(symbols.filter((s) => s !== symbolToRemove));
  };

  const handleAddSymbol = () => {
    if (symbols.includes(symbol)) {
      alert("This stock is already in the comparison list.");
      return; // Don't add the stock if it's already in the list
    }
    setSymbols([...symbols, symbol]);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-center mb-4">Stock Trend Viewer</h1>
      <Card className="p-4 shadow-lg rounded-lg">
        <CardContent>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={symbol} 
              onChange={(e) => setSymbol(e.target.value.toUpperCase())} 
              placeholder="Enter stock symbol" 
              className="p-2 border rounded w-full"
            />
            <Button onClick={handleAddSymbol} disabled={loading}>
              {loading ? "Loading..." : "Add Stock"}
            </Button>
          </div>
          <select className="p-2 border rounded mb-4" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="TIME_SERIES_DAILY">Daily</option>
            <option value="TIME_SERIES_WEEKLY">Weekly</option>
            <option value="TIME_SERIES_MONTHLY">Monthly</option>
          </select>
          <ResponsiveContainer width="95%" height={300}>
            <LineChart data={data} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
              <XAxis dataKey="date" tickFormatter={(tick) => tick.substring(5)} />
              <YAxis />
              <Tooltip />
              <Legend />
              {symbols.map((s) => (
                <Line 
                  key={s} 
                  type="monotone" 
                  dataKey="close" 
                  name={s} 
                  data={data.filter(d => d.symbol === s)} 
                  strokeWidth={2} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4">
            <h3 className="font-bold">Comparing:</h3>
            <ul className="list-disc pl-6">
              {symbols.map((s) => (
                <li key={s} className="flex justify-between">
                  {s}
                  <button 
                    onClick={() => handleRemoveSymbol(s)} 
                    className="text-red-500 ml-2"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockTrendApp;
