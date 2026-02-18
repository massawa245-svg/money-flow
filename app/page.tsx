import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
               Send Money Instantly
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              The fastest, safest way to transfer money globally. 
              Zero fees, real-time transactions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/transfer" 
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-transform hover:scale-105 shadow-lg"
              >
                 Send Money Now
              </Link>
              <Link 
                href="/dashboard" 
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-blue-600 transition-transform hover:scale-105"
              >
                 View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">
            Why Choose MoneyFlow?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="text-5xl mb-4"></div>
              <h3 className="text-xl font-bold mb-2">Instant Transfer</h3>
              <p className="text-gray-600">Money arrives in seconds, not days</p>
            </div>
            <div className="text-center p-6">
              <div className="text-5xl mb-4"></div>
              <h3 className="text-xl font-bold mb-2">Bank-Level Security</h3>
              <p className="text-gray-600">End-to-end encryption & fraud protection</p>
            </div>
            <div className="text-center p-6">
              <div className="text-5xl mb-4"></div>
              <h3 className="text-xl font-bold mb-2">Zero Fees</h3>
              <p className="text-gray-600">No hidden charges, no surprises</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">1M+</div>
              <div className="text-gray-600">Daily Volume</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">50K+</div>
              <div className="text-gray-600">Happy Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">150+</div>
              <div className="text-gray-600">Countries</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">0</div>
              <div className="text-gray-600">Fees</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
