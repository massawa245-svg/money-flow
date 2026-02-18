"use client"
import { useState } from "react"
import Link from "next/link"

export default function TransactionsPage() {
  const [filter, setFilter] = useState("all")
  
  const transactions = [
    { id: 1, type: "sent", recipient: "Alice Johnson", amount: 150.00, date: "2024-02-11", status: "completed" },
    { id: 2, type: "received", sender: "Bob Smith", amount: 75.50, date: "2024-02-10", status: "completed" },
    { id: 3, type: "sent", recipient: "Carol Davis", amount: 200.00, date: "2024-02-09", status: "pending" },
    { id: 4, type: "received", sender: "David Brown", amount: 50.00, date: "2024-02-08", status: "completed" },
    { id: 5, type: "sent", recipient: "Eva Green", amount: 320.00, date: "2024-02-07", status: "completed" },
  ]

  const filteredTransactions = filter === "all" 
    ? transactions 
    : transactions.filter(t => t.type === filter)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800"> Transaction History</h1>
        <Link href="/transfer" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
           New Transfer
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("sent")}
          className={`px-4 py-2 rounded-lg ${filter === "sent" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Sent
        </button>
        <button
          onClick={() => setFilter("received")}
          className={`px-4 py-2 rounded-lg ${filter === "received" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Received
        </button>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-gray-600 font-semibold">Type</th>
                <th className="text-left py-4 px-6 text-gray-600 font-semibold">From/To</th>
                <th className="text-left py-4 px-6 text-gray-600 font-semibold">Amount</th>
                <th className="text-left py-4 px-6 text-gray-600 font-semibold">Date</th>
                <th className="text-left py-4 px-6 text-gray-600 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-2 ${
                      tx.type === "sent" ? "text-orange-600" : "text-green-600"
                    }`}>
                      {tx.type === "sent" ? " Sent" : " Received"}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-medium">
                    {tx.type === "sent" ? tx.recipient : tx.sender}
                  </td>
                  <td className="py-4 px-6 font-bold text-gray-800">
                    {tx.amount.toFixed(2)}
                  </td>
                  <td className="py-4 px-6 text-gray-600">{tx.date}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold
                      ${tx.status === "completed" ? "bg-green-100 text-green-800" : ""}
                      ${tx.status === "pending" ? "bg-yellow-100 text-yellow-800" : ""}
                    `}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Card */}
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <p className="text-blue-100 mb-2">Total Sent</p>
          <p className="text-3xl font-bold">€670.00</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <p className="text-green-100 mb-2">Total Received</p>
          <p className="text-3xl font-bold">€125.50</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <p className="text-purple-100 mb-2">Transactions</p>
          <p className="text-3xl font-bold">{transactions.length}</p>
        </div>
      </div>
    </div>
  )
}
