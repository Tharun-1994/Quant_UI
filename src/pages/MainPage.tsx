import React from "react";
import { Link } from "react-router-dom";

const MainPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-indigo-600 mb-6">
        Main Page
      </h1>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Strategy management</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/strategies"
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">
            Strategy dashboard
          </Link>
          <Link to="/indicators"
            className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700">
            Indicators
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Analysis</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/compare"
            className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700">
            System comparison
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Live execution</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/execution/holdings"
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
            Holdings & tradelist
          </Link>
          <Link to="/execution/basket"
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
            Basket review
          </Link>
          <Link to="/execution/run-log"
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
            EOD run history
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MainPage;