import { createServerClient } from '@/lib/supabase';

export default async function AnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Model Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Model Performance</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">1X2 Accuracy</p>
              <p className="text-2xl font-bold">--.--%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Log Loss</p>
              <p className="text-2xl font-bold">--.---</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Calibration (ECE)</p>
              <p className="text-2xl font-bold">--.---</p>
            </div>
          </div>
        </div>

        {/* Montante Performance */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Montante Stats</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Total Series</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Win Rate</p>
              <p className="text-2xl font-bold">--%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Chain Length</p>
              <p className="text-2xl font-bold">--.--</p>
            </div>
          </div>
        </div>

        {/* Market Comparison */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">vs Bookmakers</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Edge Identified</p>
              <p className="text-2xl font-bold">--%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg EV</p>
              <p className="text-2xl font-bold">--.-%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Sharp Line</p>
              <p className="text-2xl font-bold">--.-%</p>
            </div>
          </div>
        </div>

        {/* Recent Model Runs */}
        <div className="bg-white rounded-lg shadow-sm border p-6 md:col-span-2 lg:col-span-3">
          <h2 className="text-xl font-semibold mb-4">Recent Model Runs</h2>
          <div className="text-center py-8 text-gray-600">
            No model runs yet. Models will appear here once training begins.
          </div>
        </div>

        {/* Feature Importance */}
        <div className="bg-white rounded-lg shadow-sm border p-6 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Feature Importance</h2>
          <div className="text-center py-8 text-gray-600">
            Feature importance analysis will appear here after model training.
          </div>
        </div>

        {/* Prediction Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Prediction Distribution</h2>
          <div className="text-center py-8 text-gray-600">
            Distribution charts will appear here.
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm">Data Collection: Not Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm">Model Training: Not Started</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm">Predictions: Not Available</span>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>🚀 Next steps:</p>
          <ul className="mt-2 space-y-1 ml-4">
            <li>1. Set up API Football connection</li>
            <li>2. Initialize data collection jobs</li>
            <li>3. Populate historical data</li>
            <li>4. Train initial models</li>
            <li>5. Begin generating predictions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}