import React, { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "./components/ui/Card";
import { Button } from "./components/ui/Button";
import axios from "axios";

const API_KEY = 'cusmr6hr01qnihs7i850cusmr6hr01qnihs7i85g';
const FINNHUB_URL = 'https://finnhub.io/api/v1/quote';

const fetchFromYahooFinance = async (stockSymbol, range) => {
  try {
    const response = await axios.get(
      `/yahoo-finance-api/v8/finance/chart/${stockSymbol}?range=${range}&interval=1d`
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

const fetchRealTimeData = async (stockSymbol) => {
  try {
    const response = await axios.get(FINNHUB_URL, {
      params: {
        symbol: stockSymbol,
        token: API_KEY,
      },
    });
    return response.data;  // { c, d, m, v, h, l }
  } catch (error) {
    console.error('Error fetching real-time data:', error);
    return null;
  }
};

const fetchStockSuggestions = async (query) => {
  if (!query) return [];
  try {
    const response = await axios.get(
      `/yahoo-finance-api/v1/finance/search?q=${query}&lang=en-US&region=US`
    );
    if (!response.data.quotes) return [];
    return response.data.quotes
      .filter((item) => item.symbol && item.shortname)
      .map((item) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || item.symbol,
      }));
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};

const StockTrendApp = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [symbols, setSymbols] = useState(["AAPL", "TSLA"]);
  const [suggestions, setSuggestions] = useState([]);
  const [range, setRange] = useState("1d");
  const [liveData, setLiveData] = useState(null);
  const [selectedSymbols, setSelectedSymbols] = useState([...symbols]);
  const [companyName, setCompanyName] = useState("");

  const fetchStockData = useCallback(async (stockSymbols, range) => {
    setLoading(true);
    try {
      const fetchedData = await Promise.all(
        stockSymbols.map(async (stockSymbol) => {
          let stockData = await fetchFromYahooFinance(stockSymbol, range);
          if (!stockData) {
            console.error(`Failed to fetch data for ${stockSymbol} from Yahoo Finance.`);
            return [];
          }
          return stockData || [];
        })
      );
      const sortedData = fetchedData.flat().sort((a, b) => new Date(a.date) - new Date(b.date));
      setData(sortedData);
    } catch (error) {
      console.error("Error fetching stock data", error);
    }
    setLoading(false);
  }, [range]);

  const fetchLiveData = useCallback(async () => {
    if (selectedSymbols.length > 0) {
      const realTimeData = await fetchRealTimeData(selectedSymbols[selectedSymbols.length - 1]); // Fetch for the last selected symbol
      const name = suggestions.find(s => s.symbol === selectedSymbols[selectedSymbols.length - 1])?.name || selectedSymbols[selectedSymbols.length - 1];
      setCompanyName(name);
      setLiveData(realTimeData);
    }
  }, [selectedSymbols, suggestions]);

  useEffect(() => {
    if (symbols.length > 0) {
      fetchStockData(symbols, range);  // Fetch historical data
      fetchLiveData();                  // Fetch real-time data for the first symbol
    }
  }, [symbols, range, fetchStockData, fetchLiveData]);

  const handleAddSymbol = () => {
    if (!symbol) return;
    if (symbols.includes(symbol)) {
      alert("This stock is already in the comparison list.");
      return;
    }
    setSymbols([...symbols, symbol]);
    setSymbol(""); // Clear input field after adding stock
  };

  const handleInputChange = async (e) => {
    const query = e.target.value.toUpperCase();
    setSymbol(query);
    if (query.length > 1) {
      const results = await fetchStockSuggestions(query);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (selectedSymbol) => {
    setSymbol(selectedSymbol);  // Set the selected symbol
    setSuggestions([]);         // Clear the suggestions list
    if (!symbols.includes(selectedSymbol)) {
      setSymbols([...symbols, selectedSymbol]);  // Add the selected symbol to the list
    } else {
      alert("This stock is already in the comparison list.");
    }
  };

  const handleStockSelection = (symbol) => {
    setSelectedSymbols((prev) => 
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

const handleChartClick = (data) => {
  if (data && data.payload && data.payload.symbol) {
    const clickedSymbol = data.payload.symbol;
    setSelectedSymbols([clickedSymbol]);
    const selectedCompany = suggestions.find(s => s.symbol === clickedSymbol)?.name || clickedSymbol;
    setCompanyName(selectedCompany);
    fetchLiveData(); // Fetch new live data for the clicked symbol
  }
};


  useEffect(() => {
    fetchLiveData();
  }, [selectedSymbols, fetchLiveData]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-center mb-4">Stock Trend Viewer</h1>
      <Card className="p-4 shadow-lg rounded-lg">
        <CardContent>
          <div className="relative mb-4">
            <input
              type="text"
              value={symbol}
              onChange={handleInputChange}
              placeholder="Enter stock symbol"
              className="p-2 border rounded w-full"
            />
            {suggestions.length > 0 && (
              <ul className="absolute bg-white border w-full mt-1 rounded shadow-md max-h-40 overflow-y-auto">
                {suggestions.map((s) => (
                  <li
                    key={s.symbol}
                    onClick={() => handleSuggestionClick(s.symbol)}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                  >
                    {s.symbol} - {s.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button onClick={handleAddSymbol} disabled={loading || !symbol}>
            {loading ? "Loading..." : "Add Stock"}
          </Button>

          <select className="p-2 border rounded mb-4" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="1d">1 Day</option>
            <option value="5d">5 Days</option>
            <option value="1mo">1 Month</option>
            <option value="6mo">6 Months</option>
            <option value="ytd">YTD</option>
            <option value="1y">1 Year</option>
            <option value="5y">5 Years</option>
          </select>

          {liveData && companyName && (
            <div className="mb-4">
              <h2>{companyName} ({selectedSymbols[selectedSymbols.length - 1]})</h2>
              <p>Live Price: ${liveData.c}</p>
              <p>Change: {liveData.d}%</p>
              <p>52 Week High: {liveData.h}</p>
              <p>52 Week Low: {liveData.l}</p>
            </div>
          )}

          <ResponsiveContainer width="95%" height={300}>
            <LineChart data={data} margin={{ top: 20, right: 40, left: 20, bottom: 20 }} onClick={handleChartClick}>
              <XAxis dataKey="date" tickFormatter={(tick) => tick.substring(5)} />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedSymbols.map((s) => (
                <Line key={s} type="monotone" dataKey="close" name={s} data={data.filter(d => d.symbol === s)} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <div className="mt-4">
            <h3 className="font-bold">Comparing:</h3>
            <ul className="list-disc pl-6">
              {symbols.map((s) => (
                <li
                  key={s}
                  className="flex justify-between cursor-pointer"
                  onClick={() => handleStockSelection(s)}
                >
                  {s} {selectedSymbols.includes(s) ? "(Selected)" : "(Click to select)"}
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
