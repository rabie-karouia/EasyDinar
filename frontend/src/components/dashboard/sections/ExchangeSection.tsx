import React, { useState } from 'react';
import { DollarSign, RefreshCw } from 'lucide-react';

// Mapping of currencies to ISO country codes and names
const currenciesWithFlags = [
  { code: 'TND', countryCode: 'tn', name: 'Tunisian Dinar' },
  { code: 'USD', countryCode: 'us', name: 'United States Dollar' },
  { code: 'EUR', countryCode: 'eu', name: 'Euro' },
  { code: 'JPY', countryCode: 'jp', name: 'Japanese Yen' },
  { code: 'GBP', countryCode: 'gb', name: 'British Pound Sterling' },
  { code: 'AUD', countryCode: 'au', name: 'Australian Dollar' },
  { code: 'CAD', countryCode: 'ca', name: 'Canadian Dollar' },
  { code: 'CHF', countryCode: 'ch', name: 'Swiss Franc' },
  { code: 'CNY', countryCode: 'cn', name: 'Chinese Yuan' },
  { code: 'NZD', countryCode: 'nz', name: 'New Zealand Dollar' },
  { code: 'SEK', countryCode: 'se', name: 'Swedish Krona' },
  { code: 'KRW', countryCode: 'kr', name: 'South Korean Won' },
  { code: 'SGD', countryCode: 'sg', name: 'Singapore Dollar' },
  { code: 'NOK', countryCode: 'no', name: 'Norwegian Krone' },
  { code: 'MXN', countryCode: 'mx', name: 'Mexican Peso' },
  { code: 'INR', countryCode: 'in', name: 'Indian Rupee' },
  { code: 'RUB', countryCode: 'ru', name: 'Russian Ruble' },
  { code: 'ZAR', countryCode: 'za', name: 'South African Rand' },
  { code: 'TRY', countryCode: 'tr', name: 'Turkish Lira' },
  { code: 'BRL', countryCode: 'br', name: 'Brazilian Real' },
];

export default function ExchangeSection() {
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    setError(null); // Reset error
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/exchange-rate/?base_currency=${fromCurrency}&target_currency=${toCurrency}`
      );

      if (response.ok) {
        const data = await response.json();
        const rate = data.rate;

        // Calculate converted amount
        setConvertedAmount(parseFloat(amount) * rate);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to fetch exchange rate.');
      }
    } catch (err) {
      setError('An error occurred while fetching exchange rate.');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Currency Exchange</h2>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter amount"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {currenciesWithFlags.map(({ code, countryCode, name }) => (
                  <option key={code} value={code}>
                    <img
                      src={`https://flagcdn.com/w40/${countryCode}.png`}
                      alt={`${code} flag`}
                      className="inline mr-2 h-5 w-5"
                    />
                    {code} - {name}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="self-end p-2 text-indigo-600 hover:text-indigo-700"
              onClick={() => {
                // Optional: swap currencies
                const temp = fromCurrency;
                setFromCurrency(toCurrency);
                setToCurrency(temp);
                setConvertedAmount(null); // Reset converted amount
              }}
            >
              <RefreshCw className="h-5 w-5" />
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {currenciesWithFlags.map(({ code, countryCode, name }) => (
                  <option key={code} value={code}>
                    <img
                      src={`https://flagcdn.com/w40/${countryCode}.png`}
                      alt={`${code} flag`}
                      className="inline mr-2 h-5 w-5"
                    />
                    {code} - {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors"
            onClick={handleConvert}
          >
            Convert
          </button>

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          {convertedAmount !== null && (
            <p className="text-green-600 text-lg mt-4">
              {amount} {fromCurrency} = {convertedAmount.toFixed(4)} {toCurrency}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
