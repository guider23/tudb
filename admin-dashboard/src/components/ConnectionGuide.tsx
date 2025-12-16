import { Database, Server, Cloud, HardDrive, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface GuideData {
  provider: string;
  icon: React.ElementType;
  iconColor: string;
  difficulty: 'Easy' | 'Medium';
  steps: string[];
  format: string;
  example: string;
  notes: string[];
}

export default function ConnectionGuide() {
  const guides: GuideData[] = [
    {
      provider: 'Supabase',
      icon: Database,
      iconColor: 'bg-emerald-600',
      difficulty: 'Easy',
      steps: [
        'Go to your Supabase project dashboard at https://supabase.com/dashboard',
        'Click on "Connect" button in the top right',
        'Select "ORMs" tab',
        'Change "Method" to "Session pooler" (IMPORTANT for IPv4 compatibility)',
        'Copy the connection string (it should include "pooler.supabase.com:5432")',
        'Replace [YOUR-PASSWORD] with your actual database password',
      ],
      format: 'postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:[port]/postgres',
      example: 'postgresql://postgres.ykanixtxrlnxbwxeknwb:yourpassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
      notes: [
        '⚠️ CRITICAL: Use "Session pooler" (port 5432) OR "Transaction pooler" (port 6543) - NOT "Direct connection"',
        'Direct connection is IPv6-only and will fail on Heroku, Vercel, GitHub Actions, Render',
        'Session Pooler (port 5432): Best for persistent connections and long queries',
        'Transaction Pooler (port 6543): Best for serverless functions with short transactions',
        'Both poolers are IPv4 compatible and will work on Heroku',
      ],
    },
    {
      provider: 'Neon',
      icon: Server,
      iconColor: 'bg-cyan-600',
      difficulty: 'Easy',
      steps: [
        'Log in to your Neon console at https://console.neon.tech',
        'Select your project',
        'Go to the "Dashboard" tab',
        'Look for "Connection Details" section',
        'Click "Show" next to the connection string',
        'Copy the connection string that appears',
      ],
      format: 'postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require',
      example: 'postgresql://myuser:mypassword@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require',
      notes: [
        'Neon automatically includes sslmode=require',
        'Supports branching - each branch has its own connection string',
        'Free tier includes 0.5GB storage',
      ],
    },
    {
      provider: 'Railway',
      icon: Server,
      iconColor: 'bg-purple-600',
      difficulty: 'Easy',
      steps: [
        'Open your Railway project at https://railway.app',
        'Click on your PostgreSQL database service',
        'Go to the "Connect" tab',
        'Find "Postgres Connection URL"',
        'Click to copy the full connection string',
      ],
      format: 'postgresql://postgres:[password]@[host].railway.app:[port]/railway',
      example: 'postgresql://postgres:MySecretPass123@containers-us-west-123.railway.app:5432/railway',
      notes: [
        'Railway provides both public and private connection strings',
        'Use the public connection string for external access',
        'Free tier includes $5 credit per month',
      ],
    },
    {
      provider: 'AWS RDS PostgreSQL',
      icon: Cloud,
      iconColor: 'bg-orange-600',
      difficulty: 'Medium',
      steps: [
        'Log in to AWS Console at https://console.aws.amazon.com',
        'Navigate to RDS service',
        'Select your PostgreSQL database instance',
        'Click on "Configuration" tab',
        'Find the "Endpoint" (host address) and "Port"',
        'Construct connection string using: postgresql://username:password@endpoint:port/database',
      ],
      format: 'postgresql://[username]:[password]@[endpoint]:[port]/[database]',
      example: 'postgresql://admin:mypassword@mydb.c9akciq32.us-east-1.rds.amazonaws.com:5432/postgres',
      notes: [
        'Ensure your security group allows inbound traffic on port 5432',
        'Use SSL/TLS for production databases',
        'Master username is set during database creation',
      ],
    },
    {
      provider: 'Heroku Postgres',
      icon: Server,
      iconColor: 'bg-indigo-600',
      difficulty: 'Easy',
      steps: [
        'Open your Heroku Dashboard at https://dashboard.heroku.com',
        'Select your application',
        'Go to "Resources" tab',
        'Click on "Heroku Postgres" addon',
        'Navigate to "Settings"',
        'Click "View Credentials" and copy "URI"',
      ],
      format: 'postgres://[user]:[password]@[host].compute-1.amazonaws.com:[port]/[database]',
      example: 'postgres://abcdef:long-random-password@ec2-123-45-67-89.compute-1.amazonaws.com:5432/d8fjdkl',
      notes: [
        'Credentials rotate periodically for security',
        'Always use the DATABASE_URL from Settings',
        'Free tier includes 10,000 rows',
      ],
    },
    {
      provider: 'DigitalOcean PostgreSQL',
      icon: Cloud,
      iconColor: 'bg-blue-600',
      difficulty: 'Easy',
      steps: [
        'Log in to DigitalOcean Control Panel at https://cloud.digitalocean.com',
        'Navigate to "Databases"',
        'Select your PostgreSQL cluster',
        'Go to "Connection Details"',
        'Copy the "Connection String" or construct from individual fields',
      ],
      format: 'postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require',
      example: 'postgresql://doadmin:password@db-postgresql-nyc3-12345.ondigitalocean.com:25060/defaultdb?sslmode=require',
      notes: [
        'SSL mode is required for all connections',
        'Supports connection pooling',
        'Managed backups included',
      ],
    },
    {
      provider: 'Render PostgreSQL',
      icon: Server,
      iconColor: 'bg-violet-600',
      difficulty: 'Easy',
      steps: [
        'Go to Render Dashboard at https://dashboard.render.com',
        'Click on your PostgreSQL database',
        'Scroll to "Connections"',
        'Copy "External Database URL"',
      ],
      format: 'postgresql://[user]:[password]@[host]/[database]',
      example: 'postgresql://mydb_user:abc123@dpg-abc123-abc123.oregon-postgres.render.com/mydb',
      notes: [
        'Free tier includes 90-day data retention',
        'Automatic daily backups on paid plans',
        'SSL is automatically configured',
      ],
    },
    {
      provider: 'Local PostgreSQL',
      icon: HardDrive,
      iconColor: 'bg-slate-600',
      difficulty: 'Easy',
      steps: [
        'Ensure PostgreSQL is installed on your machine',
        'Note your database credentials (default user is usually "postgres")',
        'Use localhost as the host',
        'Default port is 5432',
        'Construct the connection string',
      ],
      format: 'postgresql://[user]:[password]@localhost:5432/[database]',
      example: 'postgresql://postgres:mypassword@localhost:5432/mydatabase',
      notes: [
        'Make sure PostgreSQL service is running',
        'Default database is "postgres"',
        'SSL is usually not required for localhost',
      ],
    },
    {
      provider: 'PlanetScale MySQL',
      icon: Database,
      iconColor: 'bg-indigo-600',
      difficulty: 'Easy',
      steps: [
        'Log in to PlanetScale dashboard at https://app.planetscale.com',
        'Select your database',
        'Click "Connect" button',
        'Choose your preferred language/framework',
        'Copy the connection string provided',
      ],
      format: 'mysql://[username]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}',
      example: 'mysql://abcd1234:pscale_pw_abc123@aws.connect.psdb.cloud/mydb?ssl={"rejectUnauthorized":true}',
      notes: [
        'PlanetScale uses MySQL-compatible protocol',
        'SSL is required for all connections',
        'Supports database branching',
      ],
    },
    {
      provider: 'AWS RDS MySQL',
      icon: Cloud,
      iconColor: 'bg-orange-600',
      difficulty: 'Medium',
      steps: [
        'Log in to AWS Console at https://console.aws.amazon.com',
        'Navigate to RDS service',
        'Select your MySQL database instance',
        'Click on "Configuration" tab',
        'Find the "Endpoint" and "Port"',
        'Construct connection string: mysql://username:password@endpoint:port/database',
      ],
      format: 'mysql://[username]:[password]@[endpoint]:[port]/[database]',
      example: 'mysql://admin:mypassword@mydb.abc123.us-east-1.rds.amazonaws.com:3306/mydatabase',
      notes: [
        'Ensure security group allows inbound traffic on port 3306',
        'Enable SSL/TLS for production databases',
        'Master username is set during database creation',
      ],
    },
    {
      provider: 'Local MySQL',
      icon: HardDrive,
      iconColor: 'bg-amber-600',
      difficulty: 'Easy',
      steps: [
        'Ensure MySQL is installed on your machine',
        'Note your MySQL credentials (default user is usually "root")',
        'Use localhost as the host',
        'Default port is 3306',
        'Create a database if needed: CREATE DATABASE mydb;',
        'Construct the connection string',
      ],
      format: 'mysql://[user]:[password]@localhost:3306/[database]',
      example: 'mysql://root:mypassword@localhost:3306/mydatabase',
      notes: [
        'Make sure MySQL service is running',
        'Default database is "mysql"',
        'SSL is usually not required for localhost',
      ],
    },
    {
      provider: 'DigitalOcean MySQL',
      icon: Cloud,
      iconColor: 'bg-blue-600',
      difficulty: 'Easy',
      steps: [
        'Log in to DigitalOcean Control Panel',
        'Navigate to "Databases"',
        'Select your MySQL cluster',
        'Go to "Connection Details"',
        'Copy the connection string or construct from fields',
      ],
      format: 'mysql://[user]:[password]@[host]:[port]/[database]?ssl-mode=REQUIRED',
      example: 'mysql://doadmin:password@db-mysql-nyc3-12345.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED',
      notes: [
        'SSL mode is required for all connections',
        'Supports connection pooling',
        'Managed backups included',
      ],
    },
  ];

  return (
    <div className="max-w-5xl">
      {/* Alert Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">Database Support</h4>
            <p className="text-sm text-blue-700">
              This application supports both <strong>PostgreSQL</strong> and <strong>MySQL</strong> databases.
              All providers listed below offer either PostgreSQL or MySQL-compatible databases.
            </p>
          </div>
        </div>
      </div>

      {/* Security Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-amber-900 mb-1">Security Note</h4>
            <p className="text-sm text-amber-700">
              Never share your connection strings publicly. They contain sensitive credentials.
              All connections are encrypted and stored securely.
            </p>
          </div>
        </div>
      </div>

      {/* Provider Guides */}
      <div className="space-y-4">
        {guides.map((guide, index) => {
          const Icon = guide.icon;
          return (
            <details key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden group">
              <summary className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className={`w-12 h-12 ${guide.iconColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{guide.provider}</h3>
                  <p className="text-sm text-gray-500">Click to view setup instructions</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  guide.difficulty === 'Easy' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-yellow-50 text-yellow-700'
                }`}>
                  {guide.difficulty}
                </span>
              </summary>
              
              <div className="p-6 pt-0 border-t border-gray-100">
                {/* Steps */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    Steps to Get Connection String
                  </h4>
                  <ol className="space-y-2 list-decimal list-inside text-sm text-gray-700">
                    {guide.steps.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">{step}</li>
                    ))}
                  </ol>
                </div>

                {/* Format */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Connection String Format:</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs text-gray-700 overflow-x-auto">
                    {guide.format}
                  </div>
                </div>

                {/* Example */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Example:</h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 font-mono text-xs text-green-700 overflow-x-auto">
                    {guide.example}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Important Notes:</h4>
                  <ul className="space-y-1 list-disc list-inside text-sm text-gray-600">
                    {guide.notes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              Q: Does this app support MySQL, MongoDB, or other databases?
            </h4>
            <p className="text-sm text-gray-600">
              A: Yes! The application supports both <strong>PostgreSQL</strong> and <strong>MySQL</strong> databases.
              MongoDB and other NoSQL databases are not currently supported.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              Q: Is my connection string stored securely?
            </h4>
            <p className="text-sm text-gray-600">
              A: Yes! All connection strings are encrypted using AES-256-CBC encryption before storage.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              Q: Can I connect to multiple databases?
            </h4>
            <p className="text-sm text-gray-600">
              A: Absolutely! You can add multiple database connections and switch between them.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              Q: What if my connection test fails?
            </h4>
            <p className="text-sm text-gray-600">
              A: Common issues include incorrect password, firewall blocking, wrong database name, or SSL requirement.
              Double-check your connection string format.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
