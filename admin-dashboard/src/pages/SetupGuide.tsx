import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

export default function SetupGuide() {
  const [copiedText, setCopiedText] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('supabase');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const providers = [
    {
      id: 'supabase',
      name: 'Supabase',
      logo: 'https://img.icons8.com/color/512/supabase.png',
      category: 'PostgreSQL',
      description: 'Open source Firebase alternative with PostgreSQL database',
      websiteUrl: 'https://supabase.com',
      docsUrl: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
      connectionFormat: 'postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres',
      exampleString: 'postgresql://postgres:your_password@db.abcdefghij.supabase.co:5432/postgres',
      steps: [
        { title: 'Sign up', description: 'Create account at supabase.com' },
        { title: 'Create Project', description: 'Click "New Project" and set database password' },
        { title: 'Get Connection String', description: 'Go to Project Settings → Database → Connection String' },
        { title: 'Copy URI', description: 'Select "URI" mode and copy the connection string' }
      ],
      features: ['Built-in Auth', 'Real-time subscriptions', 'Storage', 'Edge Functions'],
      freeTier: true
    },
    {
      id: 'neon',
      name: 'Neon',
      logo: 'https://neon.tech/favicon/favicon.png',
      category: 'PostgreSQL',
      description: 'Serverless Postgres with instant branching and autoscaling',
      websiteUrl: 'https://neon.tech',
      docsUrl: 'https://neon.tech/docs/connect/connect-from-any-app',
      connectionFormat: 'postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]',
      exampleString: 'postgresql://user:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb',
      steps: [
        { title: 'Sign up', description: 'Create account at neon.tech' },
        { title: 'Create Project', description: 'Click "Create Project" and select region' },
        { title: 'Connection Details', description: 'Click on your project to view connection details' },
        { title: 'Copy Connection String', description: 'Copy the connection string from the dashboard' }
      ],
      features: ['Serverless', 'Instant branching', 'Autoscaling', 'Time travel queries'],
      freeTier: true
    },
    {
      id: 'railway',
      name: 'Railway',
      logo: 'https://railway.app/brand/logo-light.png',
      category: 'PostgreSQL',
      description: 'Deploy databases and applications with zero configuration',
      websiteUrl: 'https://railway.app',
      docsUrl: 'https://docs.railway.app/databases/postgresql',
      connectionFormat: 'postgresql://postgres:[password]@[host].railway.app:[port]/railway',
      exampleString: 'postgresql://postgres:password@containers-us-west-123.railway.app:7654/railway',
      steps: [
        { title: 'Sign up', description: 'Create account at railway.app' },
        { title: 'New Project', description: 'Click "New Project" → "Provision PostgreSQL"' },
        { title: 'Database Tab', description: 'Click on PostgreSQL service in your project' },
        { title: 'Copy Connection URL', description: 'Find "POSTGRES_URL" in Variables tab' }
      ],
      features: ['One-click deploys', 'Built-in monitoring', 'Auto-scaling', 'GitHub integration'],
      freeTier: true
    },
    {
      id: 'rds',
      name: 'AWS RDS PostgreSQL',
      logo: 'https://cdn.worldvectorlogo.com/logos/aws-rds.svg',
      category: 'PostgreSQL',
      description: 'Managed relational database service by Amazon Web Services',
      websiteUrl: 'https://aws.amazon.com/rds/',
      docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html',
      connectionFormat: 'postgresql://[username]:[password]@[endpoint]:[port]/[dbname]',
      exampleString: 'postgresql://postgres:password@mydb.abc123.us-east-1.rds.amazonaws.com:5432/mydb',
      steps: [
        { title: 'AWS Console', description: 'Log in to AWS Console and go to RDS' },
        { title: 'Create Database', description: 'Click "Create database" and select PostgreSQL' },
        { title: 'Configure Instance', description: 'Set DB instance identifier, username, password' },
        { title: 'Connectivity', description: 'Copy endpoint from the Connectivity section' }
      ],
      features: ['High availability', 'Automated backups', 'Read replicas', 'Multi-AZ deployment'],
      freeTier: true
    },
    {
      id: 'herokupostgres',
      name: 'Heroku Postgres',
      logo: 'https://cdn.worldvectorlogo.com/logos/heroku-1.svg',
      category: 'PostgreSQL',
      description: 'Reliable and powerful database as a service by Heroku',
      websiteUrl: 'https://www.heroku.com/postgres',
      docsUrl: 'https://devcenter.heroku.com/articles/heroku-postgresql',
      connectionFormat: 'postgresql://[user]:[password]@[host].compute-1.amazonaws.com:[port]/[dbname]',
      exampleString: 'postgresql://user:password@ec2-12-345-67-890.compute-1.amazonaws.com:5432/d1a2b3c4d5',
      steps: [
        { title: 'Install CLI', description: 'Install Heroku CLI and login' },
        { title: 'Create App', description: 'Run: heroku create your-app-name' },
        { title: 'Add Postgres', description: 'Run: heroku addons:create heroku-postgresql:essential-0' },
        { title: 'Get Credentials', description: 'Run: heroku config:get DATABASE_URL' }
      ],
      features: ['Continuous protection', 'Rollback', 'Dataclips', 'Fork & follow'],
      freeTier: true
    },
    {
      id: 'googlecloudsql',
      name: 'Google Cloud SQL PostgreSQL',
      logo: 'https://cdn.worldvectorlogo.com/logos/google-cloud-2.svg',
      category: 'PostgreSQL',
      description: 'Fully managed PostgreSQL database service on Google Cloud',
      websiteUrl: 'https://cloud.google.com/sql',
      docsUrl: 'https://cloud.google.com/sql/docs/postgres/connect-overview',
      connectionFormat: 'postgresql://[user]:[password]@[public-ip]:[port]/[dbname]',
      exampleString: 'postgresql://postgres:password@35.123.456.78:5432/mydb',
      steps: [
        { title: 'GCP Console', description: 'Go to Google Cloud Console → SQL' },
        { title: 'Create Instance', description: 'Click "Create Instance" → Choose PostgreSQL' },
        { title: 'Set Password', description: 'Configure instance and set postgres password' },
        { title: 'Public IP', description: 'Enable public IP and add authorized networks' }
      ],
      features: ['Automatic replication', 'Point-in-time recovery', 'High availability', 'IAM integration'],
      freeTier: false
    },
    {
      id: 'azurepostgres',
      name: 'Azure Database for PostgreSQL',
      logo: 'https://cdn.worldvectorlogo.com/logos/azure-1.svg',
      category: 'PostgreSQL',
      description: 'Fully managed PostgreSQL database service by Microsoft Azure',
      websiteUrl: 'https://azure.microsoft.com/en-us/products/postgresql',
      docsUrl: 'https://learn.microsoft.com/en-us/azure/postgresql/',
      connectionFormat: 'postgresql://[user]@[servername]:[password]@[servername].postgres.database.azure.com:[port]/[dbname]',
      exampleString: 'postgresql://myadmin@myserver:password@myserver.postgres.database.azure.com:5432/postgres',
      steps: [
        { title: 'Azure Portal', description: 'Log in to Azure Portal' },
        { title: 'Create Resource', description: 'Search "Azure Database for PostgreSQL" and create' },
        { title: 'Configure Server', description: 'Set server name, admin username, password' },
        { title: 'Connection Strings', description: 'Go to "Connection strings" in server settings' }
      ],
      features: ['Built-in HA', 'Automated backups', 'Advanced threat protection', 'Azure AD authentication'],
      freeTier: false
    },
    {
      id: 'digitaloceanpostgres',
      name: 'DigitalOcean Managed PostgreSQL',
      logo: 'https://www.vectorlogo.zone/logos/digitalocean/digitalocean-icon.svg',
      category: 'PostgreSQL',
      description: 'Scalable PostgreSQL database clusters on DigitalOcean',
      websiteUrl: 'https://www.digitalocean.com/products/managed-databases-postgresql',
      docsUrl: 'https://docs.digitalocean.com/products/databases/postgresql/',
      connectionFormat: 'postgresql://[user]:[password]@[host]:[port]/[dbname]?sslmode=require',
      exampleString: 'postgresql://doadmin:password@db-postgresql-nyc1-12345.ondigitalocean.com:25060/defaultdb?sslmode=require',
      steps: [
        { title: 'DigitalOcean Panel', description: 'Log in to DigitalOcean control panel' },
        { title: 'Create Database', description: 'Click "Create" → "Databases" → PostgreSQL' },
        { title: 'Choose Plan', description: 'Select cluster size and region' },
        { title: 'Connection Details', description: 'Copy connection string from Overview tab' }
      ],
      features: ['Automatic failover', 'Daily backups', 'Connection pooling', 'Read replicas'],
      freeTier: false
    },
    {
      id: 'aivenpostgres',
      name: 'Aiven for PostgreSQL',
      logo: 'https://assets.topadvisor.com/media/_solution_logo_09222023_26755928.png',
      category: 'PostgreSQL',
      description: 'Multi-cloud managed PostgreSQL database service',
      websiteUrl: 'https://aiven.io/postgresql',
      docsUrl: 'https://docs.aiven.io/docs/products/postgresql',
      connectionFormat: 'postgresql://[user]:[password]@[host]:[port]/[dbname]?sslmode=require',
      exampleString: 'postgresql://avnadmin:password@pg-12345-myproject.aivencloud.com:12345/defaultdb?sslmode=require',
      steps: [
        { title: 'Aiven Console', description: 'Sign up and log in to console.aiven.io' },
        { title: 'Create Service', description: 'Click "Create service" → Select PostgreSQL' },
        { title: 'Choose Cloud', description: 'Select cloud provider and region' },
        { title: 'Service URI', description: 'Copy Service URI from Overview page' }
      ],
      features: ['Multi-cloud', 'Advanced security', 'Automatic updates', 'Integrated extensions'],
      freeTier: true
    },
    {
      id: 'render',
      name: 'Render PostgreSQL',
      logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSlZQ5lkKr_NTo29xqy0X5VQSQknoPuhuu3A&s',
      category: 'PostgreSQL',
      description: 'Fully managed PostgreSQL databases on Render',
      websiteUrl: 'https://render.com/docs/databases',
      docsUrl: 'https://render.com/docs/postgresql',
      connectionFormat: 'postgresql://[user]:[password]@[host]:[port]/[dbname]',
      exampleString: 'postgresql://myuser:password@dpg-abc123-a.ohio-postgres.render.com:5432/mydb_abc',
      steps: [
        { title: 'Render Dashboard', description: 'Sign up and log in to dashboard.render.com' },
        { title: 'New PostgreSQL', description: 'Click "New +" → "PostgreSQL"' },
        { title: 'Configure Database', description: 'Set name, region, and plan' },
        { title: 'Connection String', description: 'Copy "External Database URL" from Info tab' }
      ],
      features: ['Auto-scaling', 'Point-in-time recovery', 'Daily backups', 'Private networking'],
      freeTier: true
    },
    {
      id: 'cockroachdb',
      name: 'CockroachDB',
      logo: 'https://cdn.worldvectorlogo.com/logos/cockroachdb.svg',
      category: 'PostgreSQL',
      description: 'Distributed SQL database compatible with PostgreSQL',
      websiteUrl: 'https://www.cockroachlabs.com',
      docsUrl: 'https://www.cockroachlabs.com/docs/stable/connect-to-the-database',
      connectionFormat: 'postgresql://[user]:[password]@[host]:[port]/[dbname]?sslmode=verify-full',
      exampleString: 'postgresql://myuser:password@free-tier.gcp-us-central1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full',
      steps: [
        { title: 'CockroachDB Cloud', description: 'Sign up at cockroachlabs.cloud' },
        { title: 'Create Cluster', description: 'Click "Create Cluster" and select plan' },
        { title: 'Create SQL User', description: 'Add SQL user with password' },
        { title: 'Connection String', description: 'Copy connection string from "Connect" modal' }
      ],
      features: ['Global distribution', 'Horizontal scaling', 'Built-in resilience', 'ACID transactions'],
      freeTier: true
    },
    {
      id: 'timescalecloud',
      name: 'Timescale Cloud',
      logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1QlKlW-KT-OZe6dffDTgSEf3abClfbRdtYA&s',
      category: 'PostgreSQL',
      description: 'Time-series PostgreSQL database optimized for fast ingest and queries',
      websiteUrl: 'https://www.timescale.com',
      docsUrl: 'https://docs.timescale.com/use-timescale/latest/connecting/',
      connectionFormat: 'postgresql://[user]:[password]@[host]:[port]/[dbname]?sslmode=require',
      exampleString: 'postgresql://tsdbadmin:password@abc123.tsdb.cloud.timescale.com:12345/tsdb?sslmode=require',
      steps: [
        { title: 'Timescale Console', description: 'Sign up at console.cloud.timescale.com' },
        { title: 'Create Service', description: 'Click "Create service" and select region' },
        { title: 'Configure Service', description: 'Choose compute and storage options' },
        { title: 'Connection Info', description: 'Copy connection string from service overview' }
      ],
      features: ['Hypertables', 'Continuous aggregates', 'Compression', 'Time-series analytics'],
      freeTier: true
    },
    {
      id: 'planetscale',
      name: 'PlanetScale',
      logo: 'https://avatars.githubusercontent.com/u/35612527?s=200&v=4',
      category: 'MySQL',
      description: 'Serverless MySQL platform with branching and scaling',
      websiteUrl: 'https://planetscale.com',
      docsUrl: 'https://planetscale.com/docs/concepts/connection-strings',
      connectionFormat: 'mysql://[user]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}',
      exampleString: 'mysql://username:pscale_pw_password@aws.connect.psdb.cloud/mydb?ssl={"rejectUnauthorized":true}',
      steps: [
        { title: 'PlanetScale Account', description: 'Sign up at planetscale.com' },
        { title: 'Create Database', description: 'Click "New database" and select region' },
        { title: 'Create Password', description: 'Go to Settings → Passwords → New password' },
        { title: 'Connection String', description: 'Copy connection string for your application' }
      ],
      features: ['Database branching', 'Schema migrations', 'Query insights', 'Horizontal sharding'],
      freeTier: true
    },
    {
      id: 'azuremysql',
      name: 'Azure Database for MySQL',
      logo: 'https://cdn.worldvectorlogo.com/logos/azure-1.svg',
      category: 'MySQL',
      description: 'Fully managed MySQL database service by Microsoft Azure',
      websiteUrl: 'https://azure.microsoft.com/en-us/products/mysql',
      docsUrl: 'https://learn.microsoft.com/en-us/azure/mysql/',
      connectionFormat: 'mysql://[user]@[servername]:[password]@[servername].mysql.database.azure.com:[port]/[dbname]',
      exampleString: 'mysql://myadmin@myserver:password@myserver.mysql.database.azure.com:3306/mydb',
      steps: [
        { title: 'Azure Portal', description: 'Log in to Azure Portal' },
        { title: 'Create Resource', description: 'Search "Azure Database for MySQL" and create' },
        { title: 'Configure Server', description: 'Set server name, admin username, password' },
        { title: 'Connection Strings', description: 'Go to "Connection strings" in server settings' }
      ],
      features: ['Built-in HA', 'Automated backups', 'Advanced threat protection', 'Azure AD authentication'],
      freeTier: false
    },
    {
      id: 'googlecloudsqlmysql',
      name: 'Google Cloud SQL MySQL',
      logo: 'https://cdn.worldvectorlogo.com/logos/google-cloud-2.svg',
      category: 'MySQL',
      description: 'Fully managed MySQL database service on Google Cloud',
      websiteUrl: 'https://cloud.google.com/sql',
      docsUrl: 'https://cloud.google.com/sql/docs/mysql/connect-overview',
      connectionFormat: 'mysql://[user]:[password]@[public-ip]:[port]/[dbname]',
      exampleString: 'mysql://root:password@35.123.456.78:3306/mydb',
      steps: [
        { title: 'GCP Console', description: 'Go to Google Cloud Console → SQL' },
        { title: 'Create Instance', description: 'Click "Create Instance" → Choose MySQL' },
        { title: 'Set Password', description: 'Configure instance and set root password' },
        { title: 'Public IP', description: 'Enable public IP and add authorized networks' }
      ],
      features: ['Automatic replication', 'Point-in-time recovery', 'High availability', 'IAM integration'],
      freeTier: false
    },
    {
      id: 'digitaloceanmysql',
      name: 'DigitalOcean Managed MySQL',
      logo: 'https://www.vectorlogo.zone/logos/digitalocean/digitalocean-icon.svg',
      category: 'MySQL',
      description: 'Scalable MySQL database clusters on DigitalOcean',
      websiteUrl: 'https://www.digitalocean.com/products/managed-databases-mysql',
      docsUrl: 'https://docs.digitalocean.com/products/databases/mysql/',
      connectionFormat: 'mysql://[user]:[password]@[host]:[port]/[dbname]?ssl-mode=REQUIRED',
      exampleString: 'mysql://doadmin:password@db-mysql-nyc1-12345.ondigitalocean.com:25060/defaultdb?ssl-mode=REQUIRED',
      steps: [
        { title: 'DigitalOcean Panel', description: 'Log in to DigitalOcean control panel' },
        { title: 'Create Database', description: 'Click "Create" → "Databases" → MySQL' },
        { title: 'Choose Plan', description: 'Select cluster size and region' },
        { title: 'Connection Details', description: 'Copy connection string from Overview tab' }
      ],
      features: ['Automatic failover', 'Daily backups', 'Connection pooling', 'Read replicas'],
      freeTier: false
    },
    {
      id: 'aivenmysql',
      name: 'Aiven for MySQL',
      logo: 'https://assets.topadvisor.com/media/_solution_logo_09222023_26755928.png',
      category: 'MySQL',
      description: 'Multi-cloud managed MySQL database service',
      websiteUrl: 'https://aiven.io/mysql',
      docsUrl: 'https://docs.aiven.io/docs/products/mysql',
      connectionFormat: 'mysql://[user]:[password]@[host]:[port]/[dbname]?ssl-mode=REQUIRED',
      exampleString: 'mysql://avnadmin:password@mysql-12345-myproject.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED',
      steps: [
        { title: 'Aiven Console', description: 'Sign up and log in to console.aiven.io' },
        { title: 'Create Service', description: 'Click "Create service" → Select MySQL' },
        { title: 'Choose Cloud', description: 'Select cloud provider and region' },
        { title: 'Service URI', description: 'Copy Service URI from Overview page' }
      ],
      features: ['Multi-cloud', 'Advanced security', 'Automatic updates', 'Integrated extensions'],
      freeTier: true
    },
    {
      id: 'auroramysql',
      name: 'Amazon Aurora MySQL',
      logo: 'https://cdn.worldvectorlogo.com/logos/aws-rds.svg',
      category: 'MySQL',
      description: 'MySQL-compatible relational database built for the cloud',
      websiteUrl: 'https://aws.amazon.com/rds/aurora/',
      docsUrl: 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMySQL.html',
      connectionFormat: 'mysql://[username]:[password]@[endpoint]:[port]/[dbname]',
      exampleString: 'mysql://admin:password@myaurora.cluster-abc123.us-east-1.rds.amazonaws.com:3306/mydb',
      steps: [
        { title: 'AWS Console', description: 'Log in to AWS Console and go to RDS' },
        { title: 'Create Database', description: 'Click "Create database" and select Amazon Aurora' },
        { title: 'Choose MySQL', description: 'Select MySQL-compatible edition' },
        { title: 'Connection Endpoint', description: 'Copy cluster endpoint from Connectivity section' }
      ],
      features: ['5x faster than MySQL', 'Auto-scaling storage', 'Multi-AZ', 'Read replicas'],
      freeTier: true
    }
  ];

  const selectedProviderData = providers.find(p => p.id === selectedProvider);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2 tracking-tight">Connection Guides</h1>
          <p className="text-base text-gray-500">Setup instructions for cloud database providers</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Provider List */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* PostgreSQL Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">PostgreSQL</h3>
                <div className="space-y-1">
                  {providers.filter(p => p.category === 'PostgreSQL').map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                        selectedProvider === provider.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <img src={provider.logo} alt={provider.name} className="w-5 h-5 object-contain flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{provider.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* MySQL Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">MySQL</h3>
                <div className="space-y-1">
                  {providers.filter(p => p.category === 'MySQL').map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                        selectedProvider === provider.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <img src={provider.logo} alt={provider.name} className="w-5 h-5 object-contain flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{provider.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Provider Details */}
          {selectedProviderData && (
            <div className="lg:col-span-3">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Provider Header */}
                <div className="p-8 border-b border-gray-200 bg-white">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <img 
                        src={selectedProviderData.logo} 
                        alt={selectedProviderData.name} 
                        className="w-12 h-12 object-contain"
                      />
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">{selectedProviderData.name}</h2>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">{selectedProviderData.category}</span>
                          {selectedProviderData.freeTier && (
                            <span className="text-xs text-green-600">Free tier available</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={selectedProviderData.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <span>Website</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <span className="text-gray-300">|</span>
                      <a
                        href={selectedProviderData.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <span>Docs</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedProviderData.description}</p>
                </div>

                <div className="p-8 bg-white space-y-8">
                  {/* Features */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProviderData.features.map((feature, idx) => (
                        <span key={idx} className="text-sm text-gray-700 px-3 py-1.5 bg-gray-50 rounded-md border border-gray-200">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Setup Steps */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Setup</h3>
                    <div className="space-y-4">
                      {selectedProviderData.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-4">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-medium">
                            {idx + 1}
                          </span>
                          <div className="flex-1 pt-0.5">
                            <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
                            <p className="text-sm text-gray-600 mt-0.5">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Connection String Format */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Connection String Format</h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 relative group">
                      <pre className="text-xs text-gray-700 font-mono overflow-x-auto">{selectedProviderData.connectionFormat}</pre>
                      <button
                        onClick={() => handleCopy(selectedProviderData.connectionFormat)}
                        className="absolute top-3 right-3 p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {copiedText === selectedProviderData.connectionFormat ? (
                          <Check className="w-3.5 h-3.5 text-gray-900" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Example Connection String */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Example</h3>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 relative group">
                      <code className="text-xs text-gray-700 font-mono break-all block">{selectedProviderData.exampleString}</code>
                      <button
                        onClick={() => handleCopy(selectedProviderData.exampleString)}
                        className="absolute top-3 right-3 p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        {copiedText === selectedProviderData.exampleString ? (
                          <Check className="w-3.5 h-3.5 text-gray-900" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
