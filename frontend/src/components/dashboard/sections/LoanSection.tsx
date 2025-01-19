import React, { useState } from "react";
import { DollarSign, Briefcase, PiggyBank, Calculator } from "lucide-react";
import axios from "axios";

export default function LoanSection() {
  const [formData, setFormData] = useState({
    income: "",
    debt: "",
    savings: "",
    employmentStatus: "employed",
  });
  const [response, setResponse] = useState<any>(null); // Store API response
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await axios.post("http://localhost:8000/loan-eligibility", {
        income: parseFloat(formData.income),
        debt: parseFloat(formData.debt),
        savings: parseFloat(formData.savings),
        employment_status: formData.employmentStatus,
      });
      setResponse(res.data);
    } catch (err) {
      setError("Failed to fetch loan eligibility. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-blue-600 p-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          Loan Eligibility & Simulation
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Income Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <DollarSign className="w-4 h-4 text-blue-500" />
              Monthly Income
            </label>
            <input
              type="number"
              name="income"
              value={formData.income}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your monthly income"
              required
            />
          </div>

          {/* Monthly Debt Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <DollarSign className="w-4 h-4 text-red-500" />
              Monthly Debt
            </label>
            <input
              type="number"
              name="debt"
              value={formData.debt}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your monthly debt"
              required
            />
          </div>

          {/* Savings Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <PiggyBank className="w-4 h-4 text-green-500" />
              Total Savings
            </label>
            <input
              type="number"
              name="savings"
              value={formData.savings}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your total savings"
              required
            />
          </div>

          {/* Employment Status Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Briefcase className="w-4 h-4 text-purple-500" />
              Employment Status
            </label>
            <select
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="employed">Employed</option>
              <option value="self-employed">Self-Employed</option>
              <option value="unemployed">Unemployed</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200 flex items-center justify-center gap-2"
        >
          <Calculator className="w-5 h-5" />
          {loading ? "Calculating..." : "Calculate Eligibility"}
        </button>
      </form>

      {error && (
        <div className="p-6 bg-red-50 border-t text-red-600">
          <p>{error}</p>
        </div>
      )}

      {response && (
        <div className="p-6 bg-gray-50 border-t">
          <h2 className="text-lg font-semibold mb-2">Eligibility Results</h2>
          <p>
            <strong>Score:</strong> {response.score}
          </p>
          <p>
            <strong>Status:</strong> {response.loan_eligibility}
          </p>
          <p>
            <strong>Recommendations:</strong> {response.recommendations}
          </p>

          <h3 className="text-md font-semibold mt-4">Here are some handy loan simulator links for each bank to help you get accurate estimates :</h3>
          <ul className="list-disc pl-5 space-y-2">
            {response.loan_links.map((link: any, index: number) => (
              <li key={index}>
                <strong>{link.bank}</strong>
                <br />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Loan Simulator
                </a>
                {link.simulateur_url && (
                  <a
                    href={link.simulateur_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 text-purple-500 hover:underline"
                  >
                    Simulate Your Loan
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
