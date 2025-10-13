import React from "react";
import { Link } from "react-router-dom";

const MainPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-indigo-600 mb-4">
        Main Page
      </h1>
      <Link
        to="/strategies"
        className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
      >
        Go to Strategy Dashboard
      </Link>
    </div>
  );
};

export default MainPage;
